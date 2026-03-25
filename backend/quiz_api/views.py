import logging
import ast
import secrets
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from rest_framework.pagination import PageNumberPagination
import json
import requests
import time

from .models import Student, Question, StudentAnswer
from .serializers import StudentSerializer, QuestionSerializer, StudentAnswerSerializer

logger = logging.getLogger(__name__)


def _get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _check_rate_limit(request, key_suffix, limit, window):
    ip = _get_client_ip(request)
    cache_key = f"rl_{ip}_{key_suffix}"
    count = cache.get(cache_key, 0)
    if count >= limit:
        return True
    cache.set(cache_key, count + 1, window)
    return False


import threading

def _send_result_email(student):
    subject = "code144p '26 - Your Results"
    message = (
        f"Hello {student.name},\n\n"
        f"Thank you for participating in code144p '26!\n\n"
        f"Your Results:\n"
        f"  Round 1 Score : {student.round1_score}\n"
        f"  Round 2 Score : {student.round2_score}\n"
        f"  Total Score   : {student.total_score}\n\n"
        f"Results will be announced shortly.\n\n"
        f"Best regards,\ncode 144p Team"
    )
    
    def send():
        try:
            send_mail(subject, message, settings.EMAIL_HOST_USER, [student.email], fail_silently=True)
            logger.info(f"Result email sent to {student.email}.")
        except Exception as e:
            logger.error(f"Email failed for {student.email}: {e}")
            
    threading.Thread(target=send, daemon=True).start()


class LeaderboardPagination(PageNumberPagination):
    page_size = 50
    max_page_size = 200


# ── STUDENT REGISTRATION ─────────────────────────────────────────────────────

@csrf_exempt
def create_student(request):
    if request.method == "POST":
        if _check_rate_limit(request, "register", 10, 300):
            return JsonResponse({"error": "Too many registration attempts. Please try again later."}, status=429)
        
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

        try:
            email = data.get("email", "").strip().lower()
            token = secrets.token_urlsafe(32)
            student = Student.objects.create(
                name=data.get("name", "").strip(),
                email=email,
                department=data.get("department", "").strip(),
                college=data.get("college", "").strip(),
                year=data.get("year", "").strip(),
                access_token=token,
            )
            logger.info(f"Student registered: {student.name} ({student.email})")
            return JsonResponse({
                "id": student.id,
                "token": student.access_token,
                "message": "Student created successfully"
            }, status=201)
        except IntegrityError:
            return JsonResponse(
                {"error": "This email is already registered. Please use a different email address."},
                status=400
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Invalid request method"}, status=405)


# ── ADMIN AUTH ────────────────────────────────────────────────────────────────

@api_view(['POST'])
def superuser_login(request):
    if _check_rate_limit(request, "admin_login", 5, 60):
        return Response({"error": "Too many login attempts. Please try again later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user is not None:
        if user.is_superuser:
            token, created = Token.objects.get_or_create(user=user)
            logger.info(f"Admin login successful for user: {username}")
            return Response({"token": token.key, "message": "Login successful"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Not authorized as admin"}, status=status.HTTP_403_FORBIDDEN)
    
    logger.warning(f"Failed admin login attempt for username: {username}")
    return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['DELETE'])
def delete_student(request, pk):
    try:
        student = Student.objects.get(pk=pk)
        student.delete()
        return Response({'message': 'Student deleted'}, status=200)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)


# ── QUESTIONS ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_questions(request):
    import random
    round_number = int(request.query_params.get('round', 1))
    questions = list(Question.objects.filter(round_number=round_number))
    random.shuffle(questions)
    
    serializer = QuestionSerializer(questions, many=True)
    data = serializer.data
    
    # Do not leak correct option to students for Round 1
    if round_number == 1:
        for q in data:
            q.pop('correct_option', None)
            
    return Response(data)


@api_view(['GET'])
def list_questions_admin(request):
    round_filter = request.query_params.get('round')
    if round_filter:
        questions = Question.objects.filter(round_number=int(round_filter)).order_by('id')
    else:
        questions = Question.objects.all().order_by('round_number', 'id')
    serializer = QuestionSerializer(questions, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def create_question(request):
    data = request.data.copy()
    round_number = int(data.get('round_number', 1))

    if round_number == 1:
        data['points']       = 10
        data['difficulty']   = 'Medium'
        data['examples']     = ''
        data['constraints']  = ''
        data['test_cases']   = []
    elif round_number == 2:
        data['points']        = 20
        data['option_a']      = ''
        data['option_b']      = ''
        data['option_c']      = ''
        data['option_d']      = ''
        data['correct_option'] = ''

    serializer = QuestionSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
def update_question(request, pk):
    try:
        question = Question.objects.get(pk=pk)
    except Question.DoesNotExist:
        return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = QuestionSerializer(question, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def bulk_update_questions(request):
    """
    Expects a list of objects: [{'id': 1, 'code_python': '...'}, ...]
    """
    updates = request.data
    if not isinstance(updates, list):
        return Response({'error': 'Expected a list of updates'}, status=status.HTTP_400_BAD_REQUEST)
    
    results = []
    errors = []
    
    for item in updates:
        pk = item.get('id')
        if not pk:
            errors.append({'error': 'Missing id for an item', 'item': item})
            continue
        try:
            q = Question.objects.get(pk=pk)
            # Use partial update
            serializer = QuestionSerializer(q, data=item, partial=True)
            if serializer.is_valid():
                serializer.save()
                results.append({'id': pk, 'status': 'updated'})
            else:
                errors.append({'id': pk, 'errors': serializer.errors})
        except Question.DoesNotExist:
            errors.append({'id': pk, 'error': 'Not found'})
            
    return Response({'results': results, 'errors': errors}, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)


@api_view(['DELETE'])
def delete_question(request, pk):
    try:
        question = Question.objects.get(pk=pk)
        question.delete()
        return Response({'message': 'Question deleted'}, status=status.HTTP_200_OK)
    except Question.DoesNotExist:
        return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)


# ── ANSWER SUBMISSION ─────────────────────────────────────────────────────────

@api_view(['POST'])
def submit_answer(request):
    student_id    = request.data.get('student_id')
    token         = request.data.get('token', '')
    question_id   = request.data.get('question_id')
    chosen_option = request.data.get('chosen_option', '')
    submitted_code = request.data.get('submitted_code', '')
    round_number  = int(request.data.get('round_number', 1))

    student  = get_object_or_404(Student, id=student_id, access_token=token)
    question = get_object_or_404(Question, id=question_id)

    is_correct = False
    if round_number == 1:
        if question.correct_option and chosen_option:
            is_correct = (chosen_option.upper() == question.correct_option.upper())
    elif round_number == 2:
        if chosen_option == "CORRECT":
            is_correct = True
        elif str(request.data.get('is_correct', '')).lower() == 'true':
            is_correct = True

    try:
        existing_answer = StudentAnswer.objects.get(student=student, question=question)
        old_is_correct = existing_answer.is_correct
    except StudentAnswer.DoesNotExist:
        existing_answer = None
        old_is_correct = False

    answer, created = StudentAnswer.objects.update_or_create(
        student=student,
        question=question,
        defaults={
            'chosen_option': chosen_option[:50] if chosen_option else '',
            'submitted_code': submitted_code,
            'is_correct': is_correct,
            'round_number': round_number
        }
    )

    delta = 0
    if is_correct and not old_is_correct:
        delta = question.points
    elif not is_correct and old_is_correct:
        delta = -question.points

    if delta != 0:
        with transaction.atomic():
            student = Student.objects.select_for_update().get(id=student_id)
            if round_number == 1:
                student.round1_score = max(0, student.round1_score + delta)
            else:
                student.round2_score = max(0, student.round2_score + delta)
            student.total_score = student.round1_score + student.round2_score
            student.save()

    student.refresh_from_db()

    return Response({
        'is_correct': is_correct,
        'round1_score': student.round1_score,
        'round2_score': student.round2_score,
        'total_score': student.total_score,
    }, status=status.HTTP_200_OK)


# ── ROUND 1 COMPLETION ────────────────────────────────────────────────────────

@api_view(['POST'])
def complete_round1(request):
    student_id = request.data.get('student_id')
    token      = request.data.get('token', '')
    if not student_id:
        return Response({"error": "Missing student_id"}, status=status.HTTP_400_BAD_REQUEST)

    student = get_object_or_404(Student, id=student_id, access_token=token)

    total_r1_questions = Question.objects.filter(round_number=1).count()
    max_possible_score = total_r1_questions * 10

    if max_possible_score > 0:
        percentage = (student.round1_score / max_possible_score) * 100
    else:
        percentage = 0

    qualifies = percentage >= 50

    if student.round1_completed:
        return Response({
            'round1_score':         student.round1_score,
            'max_possible_score':   max_possible_score,
            'percentage':           round(percentage, 1),
            'qualifies_for_round2': student.round2_qualified,
            'status':               'qualified' if student.round2_qualified else 'eliminated',
        }, status=status.HTTP_200_OK)

    student.round1_completed = True
    student.round1_end_time  = timezone.now()
    student.current_round    = 1
    
    if qualifies:
        student.round2_qualified = True
        
    student.save()
    logger.info(f"Student {student.name} ({student.email}) completed Round 1. Score: {student.round1_score}. Qualifies: {qualifies}")

    return Response({
        'round1_score':         student.round1_score,
        'max_possible_score':   max_possible_score,
        'percentage':           round(percentage, 1),
        'qualifies_for_round2': qualifies,
        'status':               'qualified' if qualifies else 'eliminated',
    }, status=status.HTTP_200_OK)


# ── ROUND 2 START ─────────────────────────────────────────────────────────────

@api_view(['POST'])
def start_round2(request):
    student_id = request.data.get('student_id')
    token      = request.data.get('token', '')

    student = get_object_or_404(Student, id=student_id, access_token=token)

    if not student.round2_qualified:
        return Response({"error": "Student is not qualified for Round 2."}, status=status.HTTP_403_FORBIDDEN)

    student.current_round = 2
    student.save()
    return Response({"message": "Round 2 started", "student_id": student.id}, status=status.HTTP_200_OK)


# ── ROUND 2 COMPLETION ────────────────────────────────────────────────────────

@api_view(['POST'])
def complete_round2(request):
    student_id = request.data.get('student_id')
    token      = request.data.get('token', '')

    student = get_object_or_404(Student, id=student_id, access_token=token)

    student.round2_completed = True
    student.current_round    = 2
    student.save()

    _send_result_email(student)

    return Response({
        "message":      "Round 2 completed!",
        "round1_score": student.round1_score,
        "round2_score": student.round2_score,
        "total_score":  student.total_score,
    }, status=status.HTTP_200_OK)


# ── COMPLETE QUIZ (legacy) ────────────────────────────────────────────────────

@api_view(['POST'])
def complete_quiz(request):
    student_id = request.data.get('student_id')
    score      = request.data.get('score')
    if not student_id or score is None:
        return Response({"error": "Missing student_id or score"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
    student.total_score = score
    student.save()
    return Response({"message": "Quiz completed!"}, status=status.HTTP_200_OK)


# ── LEADERBOARD ───────────────────────────────────────────────────────────────

@api_view(['GET'])
def leaderboard(request):
    round_filter = request.query_params.get('round')
    if round_filter == '1':
        students = Student.objects.filter(round1_completed=True).order_by('-round1_score', 'id')
    elif round_filter == '2':
        students = Student.objects.filter(round2_completed=True).order_by('-round2_score', 'id')
    else:
        students = Student.objects.all().order_by('-total_score', '-round2_score', 'id')

    paginator = LeaderboardPagination()
    paginated_students = paginator.paginate_queryset(students, request)

    # Compute global rank offset so rank is correct across pages
    offset = (paginator.page.start_index() - 1) if hasattr(paginator, 'page') and paginator.page else 0

    serializer = StudentSerializer(paginated_students, many=True)
    data = list(serializer.data)
    for i, item in enumerate(data):
        item['rank'] = offset + i + 1

    return paginator.get_paginated_response(data)


# ── CHECK QUALIFICATION ───────────────────────────────────────────────────────

@api_view(['GET'])
def check_qualification(request, student_id):
    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

    total_r1_questions = Question.objects.filter(round_number=1).count()
    max_possible_score = total_r1_questions * 10
    percentage = (student.round1_score / max_possible_score * 100) if max_possible_score > 0 else 0

    return Response({
        "student_id":           student.id,
        "round1_score":         student.round1_score,
        "max_possible_score":   max_possible_score,
        "percentage":           round(percentage, 1),
        "round1_completed":     student.round1_completed,
        "qualifies_for_round2": student.round2_qualified,
        "round2_completed":     student.round2_completed,
        "current_round":        student.current_round,
    })


# ── CODE COMPILER ─────────────────────────────────────────────────────────────
import subprocess
import tempfile
import os
import re
import shutil

_MAX_CODE_BYTES = 10 * 1024
_EXEC_TIMEOUT   = 10


def _check_python_ast(code: str):
    """Returns an error message if code is unsafe, else None."""
    BANNED_NAMES = {
        'os', 'sys', 'subprocess', 'shutil', 'socket', 'requests',
        'urllib', 'ctypes', 'importlib', 'builtins', 'open',
        'exec', 'eval', 'compile', '__import__', 'globals', 'locals',
        'vars', 'getattr', 'setattr', 'delattr',
    }
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return f"Syntax error: {e}"
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split('.')[0] in BANNED_NAMES:
                    return f"Import of '{alias.name}' is not allowed."
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.split('.')[0] in BANNED_NAMES:
                return f"Import from '{node.module}' is not allowed."
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in BANNED_NAMES:
                    return f"Use of '{node.func.id}' is not allowed."
    return None


def _sanitize_path(text: str) -> str:
    import re as _re
    text = _re.sub(r'[A-Za-z]:\\[^\s,\'"]+', '<path>', text)
    text = _re.sub(r'/tmp/[^\s,\'"]+', '<path>', text)
    return text


def _find_tool(cmd: str):
    import glob as _glob
    try:
        # Check if already in PATH
        subprocess.run([cmd, '--version'], capture_output=True, timeout=5)
        return cmd
    except (FileNotFoundError, subprocess.SubprocessError):
        pass

    search_dirs = (
        _glob.glob(r'C:\Program Files\Microsoft\jdk-*\bin') +
        _glob.glob(r'C:\Program Files\Eclipse Adoptium\jdk-*\bin') +
        _glob.glob(r'C:\Program Files\Java\jdk-*\bin') +
        _glob.glob(r'C:\MinGW\bin') +
        _glob.glob(r'C:\msys64\mingw64\bin') +
        _glob.glob(r'C:\msys64\ucrt64\bin') +
        _glob.glob(r'C:\Program Files\mingw-w64\*\mingw64\bin') +
        _glob.glob(r'C:\TDM-GCC-64\bin') +
        _glob.glob('/usr/lib/jvm/*/bin') +
        _glob.glob('/usr/bin') +
        _glob.glob('/usr/local/bin') +
        _glob.glob(os.path.expanduser('~/.jdk/*/bin'))
    )
    for d in search_dirs:
        candidate = os.path.join(d, cmd)
        if os.path.isfile(candidate):
            return candidate
        if os.path.isfile(candidate + '.exe'):
            return candidate + '.exe'
    return None


def _run_wandbox(language: str, code: str, input_data: str) -> str:
    """Remote execution fallback via Wandbox when local compiler is unavailable."""
    WANDBOX_URL = "https://wandbox.org/api/compile.json"

    # Correct Wandbox compiler IDs (verified from /api/list.json)
    compilers = {
        "python": "cpython-head",
        "java": "openjdk-jdk-21+35",
        "c": "gcc-head-c",          # <-- must be gcc-head-c for C, not gcc-head (C++)
    }

    payload = {
        "compiler": compilers.get(language, "gcc-head-c"),
        "code": code,
        "stdin": input_data or "",
        "save": False,
    }

    try:
        resp = requests.post(WANDBOX_URL, json=payload, timeout=15)
        if resp.status_code != 200:
            return f"Remote Execution Error (HTTP {resp.status_code})"

        data = resp.json()
        compiler_err  = (data.get("compiler_error") or "").strip()
        program_out   = (data.get("program_output") or "").strip()
        program_err   = (data.get("program_error")  or "").strip()
        exit_status   = str(data.get("status", "0"))

        # ── Friendly hint for missing main() / entry-point ────────────────
        if compiler_err and (
            "undefined reference to `main'" in compiler_err or
            "undefined reference to 'main'" in compiler_err
        ):
            lang_hint = {
                "c": (
                    "Your C code is missing a main() function.\n"
                    "Every C program must have:\n\n"
                    "  int main() {\n"
                    "      // put your code here\n"
                    "      return 0;\n"
                    "  }"
                ),
                "java": (
                    "Your Java code is missing a main() method.\n"
                    "Add this to your class:\n\n"
                    "  public static void main(String[] args) {\n"
                    "      // put your code here\n"
                    "  }"
                ),
            }
            return "Compilation Error: No main() entry point found.\n\n" + lang_hint.get(language, "")

        # ── Compiler error: strip noisy linker/path lines ─────────────────
        if compiler_err:
            clean = []
            for line in compiler_err.splitlines():
                if line.startswith("/usr/bin/ld"):  continue
                if "collect2: error:" in line:       continue
                if line.strip():                     clean.append(line)
            return "Compilation Error:\n" + "\n".join(clean)

        # ── Successful execution ──────────────────────────────────────────
        output = program_out
        if program_err:
            output = (output + "\n" + program_err).strip()
        if not output and exit_status != "0":
            output = f"Runtime Error (exit code {exit_status})"
        return output

    except requests.Timeout:
        return "Remote Execution Timeout: the code took too long to compile or run."
    except Exception as exc:
        return f"Remote Connection Error: {exc}"


def get_file_extension(language: str) -> str:
    return {'python': '.py', 'java': '.java', 'c': '.c', 'cpp': '.cpp'}.get(language, '.txt')


def run_code(file_path, language, code=None, input_data=None):
    try:
        kwargs = {"capture_output": True, "text": True, "timeout": _EXEC_TIMEOUT}
        if input_data:
            kwargs["input"] = input_data

        if language == 'python':
            try:
                subprocess.run(['python3', '--version'], capture_output=True, check=True, timeout=5)
                python_cmd = 'python3'
            except (subprocess.SubprocessError, FileNotFoundError):
                python_cmd = 'python'
            
            # Final check - if python cmd itself isn't found, fallback to piston
            try:
                result = subprocess.run([python_cmd, file_path], **kwargs)
            except (FileNotFoundError, subprocess.SubprocessError):
                return _run_wandbox(language, code or '', input_data or '')

        elif language == 'c':
            gcc_path = _find_tool('gcc')
            if not gcc_path:
                # No local GCC found — fall back to Wandbox remote compiler
                # Read the source from file so Wandbox gets the full code
                try:
                    with open(file_path, 'r', encoding='utf-8') as _f:
                        _src = _f.read()
                except Exception:
                    _src = code or ''
                return _run_wandbox(language, _src, input_data or '')

            output_path = file_path.replace('.c', '')
            compile_result = subprocess.run(
                [gcc_path, file_path, '-o', output_path],
                capture_output=True, text=True, timeout=_EXEC_TIMEOUT
            )
            if compile_result.returncode != 0:
                # Clean up noisy linker paths before returning to student
                raw_err = compile_result.stderr
                clean = []
                for ln in raw_err.splitlines():
                    if ln.startswith('/usr/bin/ld'):  continue
                    if 'collect2: error:' in ln:       continue
                    if ln.strip():                     clean.append(ln)
                return "Compilation Error:\n" + _sanitize_path("\n".join(clean))
            result = subprocess.run([output_path], **kwargs)
            try:
                os.unlink(output_path)
            except OSError:
                pass

        elif language == 'java':
            javac_path = _find_tool('javac')
            java_path = _find_tool('java')
            if not javac_path or not java_path:
                return _run_wandbox(language, code or '', input_data or '')
            match = re.search(r'\bpublic\s+class\s+(\w+)', code or '')
            if not match:
                return "Error: Could not find a public class declaration in the Java code."
            class_name = match.group(1)
            java_dir = tempfile.mkdtemp()
            try:
                java_file = os.path.join(java_dir, f'{class_name}.java')
                with open(java_file, 'w', encoding='utf-8') as f:
                    f.write(code)
                compile_result = subprocess.run(
                    [javac_path, java_file],
                    capture_output=True, text=True, timeout=_EXEC_TIMEOUT
                )
                if compile_result.returncode != 0:
                    return "Compilation Error:\n" + _sanitize_path(compile_result.stderr)
                result = subprocess.run(
                    [java_path, '-cp', java_dir, class_name], **kwargs
                )
            finally:
                shutil.rmtree(java_dir, ignore_errors=True)
        else:
            return f"Unsupported language: '{language}'."

        output = result.stdout
        if result.returncode != 0:
            output += f"\nError (exit code {result.returncode}):\n" + _sanitize_path(result.stderr)
        return output

    except subprocess.TimeoutExpired:
        return f"Execution timed out (limit: {_EXEC_TIMEOUT} seconds)."
    except Exception as e:
        return f"Execution error: {_sanitize_path(str(e))}"


@api_view(['POST'])
def compile_code(request):
    code       = request.data.get('code', '').strip()
    language   = request.data.get('language', 'python').strip().lower()
    input_data = request.data.get('input', '')

    if not code:
        return Response({'error': 'No code provided.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(code.encode('utf-8')) > _MAX_CODE_BYTES:
        return Response({'error': 'Code exceeds maximum size (10 KB).'}, status=status.HTTP_400_BAD_REQUEST)
    if len(input_data.encode('utf-8')) > _MAX_CODE_BYTES:
        return Response({'error': 'Input data exceeds maximum size.'}, status=status.HTTP_400_BAD_REQUEST)
    if language not in {'python', 'java', 'c'}:
        return Response({'error': f"Unsupported language '{language}'."}, status=status.HTTP_400_BAD_REQUEST)

    if language == 'python':
        err = _check_python_ast(code)
        if err:
            logger.error(f"Compiler AST Error: {err}")
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if language == 'java':
            output = run_code(None, language, code=code, input_data=input_data)
        else:
            suffix = get_file_extension(language)
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False, mode='w', encoding='utf-8') as tmp:
                tmp.write(code)
                tmp_path = tmp.name
            try:
                output = run_code(tmp_path, language, input_data=input_data)
            finally:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
        return Response({'output': output}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Compiler Error: {str(e)}")
        return Response({'error': f'Unexpected error: {_sanitize_path(str(e))}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)