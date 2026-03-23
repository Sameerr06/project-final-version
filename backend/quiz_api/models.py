from django.db import models
from django.utils import timezone


class Student(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=100, blank=True, default='')
    college = models.CharField(max_length=100, blank=True, default='')
    year = models.CharField(max_length=20, blank=True, default='')

    # Scoring
    round1_score = models.IntegerField(default=0)
    round2_score = models.IntegerField(default=0)
    total_score = models.IntegerField(default=0)

    # Round tracking
    current_round = models.IntegerField(default=1)        # 1 or 2
    round1_completed = models.BooleanField(default=False)
    round2_qualified = models.BooleanField(default=False)
    round2_completed = models.BooleanField(default=False)

    # Timing (for speed bonus)
    round1_start_time = models.DateTimeField(null=True, blank=True)
    round1_end_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    # Token-based ownership verification
    access_token = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        indexes = [
            models.Index(fields=['-total_score']),
            models.Index(fields=['email']),
            models.Index(fields=['round2_qualified']),
        ]

    @property
    def time_taken_seconds(self):
        if self.round1_start_time and self.round1_end_time:
            return int((self.round1_end_time - self.round1_start_time).total_seconds())
        return None

    def __str__(self):
        return f"{self.name} ({self.email})"


class Question(models.Model):
    ROUND_CHOICES = [
        (1, 'Round 1 - MCQ'),
        (2, 'Round 2 - Code Debugging'),
    ]

    text = models.TextField()
    code_snippet = models.TextField(blank=True, default='')
    option_a = models.CharField(max_length=500, blank=True, null=True)
    option_b = models.CharField(max_length=500, blank=True, null=True)
    option_c = models.CharField(max_length=500, blank=True, null=True)
    option_d = models.CharField(max_length=500, blank=True, null=True)
    correct_option = models.CharField(max_length=1, blank=True, null=True)   # 'A', 'B', 'C', or 'D'

    # Round 2 Specific
    difficulty = models.CharField(max_length=50, default="Medium")
    examples = models.TextField(blank=True, null=True)
    constraints = models.TextField(blank=True, null=True)
    test_cases = models.JSONField(default=list, blank=True)  # [{"input": "...", "expected_output": "..."}]

    # Round assignment
    round_number = models.IntegerField(choices=ROUND_CHOICES, default=1)

    # Round 2 specific
    points = models.IntegerField(default=10)          # configurable per question
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=['round_number']),
            models.Index(fields=['round_number', 'difficulty']),
        ]

    def __str__(self):
        return f"[Round {self.round_number}] {self.text[:60]}"


class StudentAnswer(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    chosen_option = models.CharField(max_length=50, blank=True, null=True)
    submitted_code = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    round_number = models.IntegerField(default=1)
    answered_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [('student', 'question')]
        indexes = [
            models.Index(fields=['student', 'round_number']),
        ]

    def __str__(self):
        return f"{self.student} - Q{self.question.id} - Round {self.round_number}"


class Leaderboard(Student):
    """Proxy model for admin leaderboard view."""
    class Meta:
        proxy = True
        verbose_name = "Leaderboard"
        verbose_name_plural = "Leaderboard"
        ordering = ["-total_score"]
