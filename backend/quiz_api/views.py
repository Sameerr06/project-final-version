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
import json
from .models import Student, Question, StudentAnswer
from .serializers import StudentSerializer, QuestionSerializer, StudentAnswerSerializer

logger = logging.getLogger(__name__)


# ── STUDENT REGISTRATION ─────────────────────────────────────────────────────

@csrf_exempt
def create_student(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            # [M8] Handle duplicate email gracefully
            try:
                token = secrets.token_urlsafe(32)
                student = Student.objects.create(
                    name=data["name"],
                    email=data["email"],
                    department=data["department"],
                    college=data["college"],
                    year=data["year"],
                    access_token=token,
                )
            except IntegrityError:
                return JsonResponse(
                    {"error": "This email is already registered. "
                              "Please use a different email address."},
                    status=400
                )
            # [C4] Return token so frontend can store it
            return JsonResponse({
                "id": student.id,
                "token": student.access_token,
                "message": "Student created successfully"
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"error": "Invalid request method"}, status=405)


# ── ADMIN AUTH ────────────────────────────────────────────────────────────────

@api_view(['POST'])
def superuser_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user is not None:
        if user.is_superuser:
            token, created = Token.objects.get_or_create(user=user)
            return Response({"token": token.key, "message": "Login successful"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Not authorized as admin"}, status=status.HTTP_403_FORBIDDEN)
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
    return Response(serializer.data)


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
        required = ['text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option']
        missing = [f for f in required if not str(data.get(f, '')).strip()]
        if missing:
            return Response(
                {'error': f'Missing required fields for Round 1: {", ".join(missing)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if str(data.get('correct_option', '')).upper() not in ('A', 'B', 'C', 'D'):
            return Response({'error': 'correct_option must be A, B, C, or D.'}, status=status.HTTP_400_BAD_REQUEST)

        # Force 10 points per Round 1 question
        data['points']       = 10
        data['difficulty']   = 'Medium'
        data['examples']     = ''
        data['constraints']  = ''
        data['test_cases']   = []

    elif round_number == 2:
        required_str = ['text', 'difficulty', 'examples', 'constraints']
        missing = [f for f in required_str if not str(data.get(f, '')).strip()]
        if missing:
            return Response(
                {'error': f'Missing required fields for Round 2: {", ".join(missing)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        test_cases = data.get('test_cases', [])
        if not isinstance(test_cases, list) or len(test_cases) == 0:
            return Response({'error': 'test_cases must be a non-empty JSON array for Round 2.'}, status=status.HTTP_400_BAD_REQUEST)
        for i, tc in enumerate(test_cases):
            if not isinstance(tc, dict) or 'input' not in tc or 'expected_output' not in tc:
                return Response(
                    {'error': f'test_cases[{i}] must have "input" and "expected_output" keys.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Force 20 points per Round 2 question
        data['points']        = 20
        data['option_a']      = ''
        data['option_b']      = ''
        data['option_c']      = ''
        data['option_d']      = ''
        data['correct_option'] = ''

    else:
        return Response({'error': 'round_number must be 1 or 2.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = QuestionSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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

    # [C4] Verify student ownership via access_token
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

    # [C3] Idempotent, atomic score update — check existing answer first
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

    # Compute score delta atomically
    delta = 0
    if is_correct and not old_is_correct:
        delta = question.points          # newly correct
    elif not is_correct and old_is_correct:
        delta = -question.points         # changed from correct to wrong

    if delta != 0:
        with transaction.atomic():
            student = Student.objects.select_for_update().get(id=student_id)
            if round_number == 1:
                student.round1_score += delta
            else:
                student.round2_score += delta
            student.total_score = student.round1_score + student.round2_score
            student.save()

    # Re-read final scores
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

    # [C4] Verify token
    student = get_object_or_404(Student, id=student_id, access_token=token)

    student.round1_completed = True
    student.round1_end_time  = timezone.now()
    student.current_round    = 1
    student.save()

    # ── Qualification logic: student must score >= 50% of total Round 1 marks ──
    total_r1_questions = Question.objects.filter(round_number=1).count()
    max_possible_score = total_r1_questions * 10

    if max_possible_score > 0:
        percentage = (student.round1_score / max_possible_score) * 100
    else:
        percentage = 0

    qualifies = percentage >= 50

    if qualifies:
        student.round2_qualified = True
        student.save()

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

    # [C4] Verify token
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

    # [C4] Verify token
    student = get_object_or_404(Student, id=student_id, access_token=token)

    student.round2_completed = True
    student.current_round    = 2
    student.save()

    subject = "CODEVERSE 2K25 - Your Results"
    message = (
        f"Hello {student.name},\n\n"
        f"Thank you for participating in CODEVERSE 2K25!\n\n"
        f"Your Results:\n"
        f"  Round 1 Score : {student.round1_score}\n"
        f"  Round 2 Score : {student.round2_score}\n"
        f"  Total Score   : {student.total_score}\n\n"
        f"Results will be announced shortly.\n\n"
        f"Best regards,\nCODEVERSE Team"
    )
    try:
        send_mail(subject, message, settings.EMAIL_HOST_USER, [student.email])
    except Exception as e:
        logger.error(f"Email failed for {student.email}: {e}")

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
        students = Student.objects.filter(round1_completed=True).order_by('-round1_score')
    elif round_filter == '2':
        students = Student.objects.filter(round2_completed=True).order_by('-round2_score')
    else:
        students = Student.objects.all().order_by('-total_score')
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)


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


# [C5] AST-based Python security check — replaces naive string blacklist
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
        subprocess.run([cmd, '-version'], capture_output=True, timeout=5)
        return cmd
    except FileNotFoundError:
        pass
    except Exception:
        return cmd
    search_dirs = (
        _glob.glob(r'C:\Program Files\Microsoft\jdk-*\bin') +
        _glob.glob(r'C:\Program Files\Eclipse Adoptium\jdk-*\bin') +
        _glob.glob(r'C:\Program Files\Java\jdk-*\bin') +
        _glob.glob('/usr/lib/jvm/*/bin') +
        _glob.glob(os.path.expanduser('~/.jdk/*/bin'))
    )
    for d in search_dirs:
        candidate = os.path.join(d, cmd)
        if os.path.isfile(candidate):
            return candidate
        if os.path.isfile(candidate + '.exe'):
            return candidate + '.exe'
    return None


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
            result = subprocess.run([python_cmd, file_path], **kwargs)

        elif language == 'c':
            gcc_path = _find_tool('gcc')
            if not gcc_path:
                return "Error: C compiler (gcc) is not installed on the server."
            output_path = file_path.replace('.c', '')
            compile_result = subprocess.run(
                [gcc_path, file_path, '-o', output_path],
                capture_output=True, text=True, timeout=_EXEC_TIMEOUT
            )
            if compile_result.returncode != 0:
                return "Compilation Error:\n" + _sanitize_path(compile_result.stderr)
            result = subprocess.run([output_path], **kwargs)
            try:
                os.unlink(output_path)
            except OSError:
                pass

        elif language == 'java':
            javac_path = _find_tool('javac')
            if not javac_path:
                return "Error: Java compiler (javac) is not installed on the server."
            java_path = _find_tool('java')
            if not java_path:
                return "Error: Java runtime (java) is not installed on the server."
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
    if language not in {'python', 'java', 'c'}:
        return Response({'error': f"Unsupported language '{language}'."}, status=status.HTTP_400_BAD_REQUEST)

    # [C5] AST-based check for Python
    if language == 'python':
        err = _check_python_ast(code)
        if err:
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
        return Response({'error': f'Unexpected error: {_sanitize_path(str(e))}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)