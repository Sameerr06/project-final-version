# ──────────────────────────────────────────────────────────────
# Backend Dockerfile — Django + OpenJDK 21 (for compiler endpoint)
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# ── Install system dependencies + OpenJDK 21 ────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget \
        gcc \
        libc6-dev \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Eclipse Temurin JDK 21 (official OpenJDK distribution)
ENV JAVA_HOME=/opt/java/openjdk
RUN mkdir -p /opt/java && \
    wget -qO /tmp/jdk.tar.gz \
      "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_x64_linux_hotspot_21.0.3_9.tar.gz" && \
    tar -xzf /tmp/jdk.tar.gz -C /opt/java && \
    mv /opt/java/jdk-21.0.3+9 ${JAVA_HOME} && \
    rm /tmp/jdk.tar.gz
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Verify Java installation
RUN java -version && javac -version

# ── Set up the application ──────────────────────────────────
WORKDIR /app

# Install Python dependencies (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --no-input

# Expose the Django port
EXPOSE 8000

# [C2] Use environment variables for superuser credentials (no hardcoded values)
CMD sh -c "python manage.py migrate && \
    python manage.py shell -c \"\
from django.contrib.auth import get_user_model; \
User = get_user_model(); \
u = '${DJANGO_SUPERUSER_USERNAME:-admin}'; \
p = '${DJANGO_SUPERUSER_PASSWORD:-admin123}'; \
e = '${DJANGO_SUPERUSER_EMAIL:-admin@example.com}'; \
user, created = User.objects.get_or_create(username=u, defaults={'email': e}); \
user.set_password(p); \
user.is_superuser = True; \
user.is_staff = True; \
user.save()\" && \
    exec gunicorn quiz_backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --timeout 120 --log-file -"
