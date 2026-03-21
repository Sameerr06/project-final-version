from django.db import migrations


class Migration(migrations.Migration):
    """[M4] No-op migration — the question seeded here already exists in 0005."""
    dependencies = [('quiz_api', '0007_studentanswer_submitted_code_and_more')]
    operations = []
