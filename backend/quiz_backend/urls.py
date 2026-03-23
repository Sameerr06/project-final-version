from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from quiz_api import views

urlpatterns = [
    # Health checks
    path('health/', lambda r: JsonResponse({'status': 'ok'}), name='health'),

    # Admin App
    path('admin/', admin.site.urls),

    # Admin Panel Auth
    path('api/login/', views.superuser_login, name='superuser_login'),

    # Student Auth / Registration
    path('api/create-student/', views.create_student, name='create_student'),
    path('api/delete-student/<int:pk>/', views.delete_student, name='delete_student'),
    path('api/check-qualification/<int:student_id>/', views.check_qualification, name='check_qualification'),

    # Quiz / Round Management
    path('api/submit-answer/', views.submit_answer, name='submit_answer'),
    path('api/complete-round1/', views.complete_round1, name='complete_round1'),
    path('api/start-round2/', views.start_round2, name='start_round2'),
    path('api/complete-round2/', views.complete_round2, name='complete_round2'),
    path('api/complete-quiz/', views.complete_quiz, name='complete_quiz'),
    path('api/leaderboard/', views.leaderboard, name='leaderboard'),

    # Compiler & Questions
    path('api/questions/', views.get_questions, name='get_questions'),
    path('api/admin/questions/', views.list_questions_admin, name='list_questions_admin'),
    path('api/admin/questions/create/', views.create_question, name='create_question'),
    path('api/admin/questions/delete/<int:pk>/', views.delete_question, name='delete_question'),
    path('api/compile/', views.compile_code, name='compile_code'),
]
