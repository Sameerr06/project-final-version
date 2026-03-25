from rest_framework import serializers
from .models import Student, Question, StudentAnswer


class StudentSerializer(serializers.ModelSerializer):
    time_taken_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'
        read_only_fields = [
            'id', 'round1_score', 'round2_score', 'total_score',
            'current_round', 'round1_completed', 'round2_qualified', 'round2_completed',
            'round1_start_time', 'round1_end_time', 'created_at', 'access_token',
        ]

    def get_time_taken_seconds(self, obj):
        return obj.time_taken_seconds

    def validate_email(self, value):
        return value.strip().lower()

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters long.")
        return value


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            'id', 'text', 'code_python', 'code_java', 'code_c',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_option', 'round_number', 'points',
            'difficulty', 'examples', 'constraints', 'test_cases',
            'test_cases_python', 'test_cases_java', 'test_cases_c',
            'created_at'
        ]

    def validate_test_cases(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Test cases must be a list.")
        for tc in value:
            if not isinstance(tc, dict):
                raise serializers.ValidationError("Each test case must be a dictionary.")
            # check for some variation of input key
            if not any(k in tc for k in ['input', 'stdin', 'in']):
                raise serializers.ValidationError("Each test case must contain an input field ('input', 'stdin', or 'in').")
            # check for some variation of expected output key
            if not any(k in tc for k in ['expected_output', 'expected', 'output', 'out']):
                raise serializers.ValidationError("Each test case must contain an expected output field.")
        return value

    def validate(self, data):
        round_number = data.get('round_number', getattr(self.instance, 'round_number', 1))
        
        if round_number == 1:
            if not data.get('text'):
                raise serializers.ValidationError({"text": "Question text is required for Round 1."})
            if not all(data.get(f"option_{opt}") for opt in ['a', 'b', 'c', 'd']):
                raise serializers.ValidationError("All 4 options are required for Round 1.")
            correct_option = data.get('correct_option', '')
            if not correct_option or correct_option.upper() not in ['A', 'B', 'C', 'D']:
                raise serializers.ValidationError({"correct_option": "Correct option must be A, B, C, or D."})
        elif round_number == 2:
            text = data.get('text', getattr(self.instance, 'text', None))
            examples = data.get('examples', getattr(self.instance, 'examples', None))
            constraints = data.get('constraints', getattr(self.instance, 'constraints', None))
            test_cases = data.get('test_cases', getattr(self.instance, 'test_cases', None))

            if not text:
                raise serializers.ValidationError({"text": "Problem statement is required for Round 2."})
            if not examples:
                raise serializers.ValidationError({"examples": "Examples are required for Round 2."})
            if not constraints:
                raise serializers.ValidationError({"constraints": "Constraints are required for Round 2."})
            if not test_cases:
                raise serializers.ValidationError({"test_cases": "Test cases are required for Round 2."})
        
        return data


class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = '__all__'
        read_only_fields = ['id', 'answered_at']
