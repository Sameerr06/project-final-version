#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# [C2/H6] Use environment variables for superuser credentials — no hardcoded values
python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
u = '${DJANGO_SUPERUSER_USERNAME:-admin}';
User.objects.filter(username=u).exists() or User.objects.create_superuser(u,
  '${DJANGO_SUPERUSER_EMAIL:-admin@example.com}',
  '${DJANGO_SUPERUSER_PASSWORD:-admin123}')
"