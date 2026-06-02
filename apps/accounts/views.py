from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import login
from django.conf import settings

from .models import User
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer
)

 
ACCESS_COOKIE   = getattr(settings, 'JWT_AUTH_COOKIE',         'access_token')
REFRESH_COOKIE  = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token')
COOKIE_SECURE   = getattr(settings, 'JWT_COOKIE_SECURE',       not settings.DEBUG)
COOKIE_SAMESITE = getattr(settings, 'JWT_COOKIE_SAMESITE',     'Lax')
 
 
def _set_auth_cookies(response: Response, refresh: RefreshToken) -> None:
    """Устанавливает access и refresh в HttpOnly cookie."""
    access_lifetime  = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    refresh_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
 
    common = dict(
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path='/',
    )
    response.set_cookie(
        ACCESS_COOKIE,
        str(refresh.access_token),
        max_age=int(access_lifetime.total_seconds()),
        **common,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        str(refresh),
        max_age=int(refresh_lifetime.total_seconds()),
        **common,
    )
 
 
def _delete_auth_cookies(response: Response) -> None:
    """Удаляет cookie авторизации."""
    response.delete_cookie(ACCESS_COOKIE,  path='/')
    response.delete_cookie(REFRESH_COOKIE, path='/')
 


class RegisterView(generics.CreateAPIView):
    """Регистрация нового пользователя"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
 
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
 
        refresh = RefreshToken.for_user(user)
 
        response = Response(
            {
                'user': UserProfileSerializer(user).data,
                'message': 'User registered successfully',
            },
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, refresh)
        return response
 
 
# ── Вход ──────────────────────────────────────────────────────────────────────
 
class LoginView(generics.GenericAPIView):
    """Вход пользователя"""
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]
 
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
 
        login(request, user)
        refresh = RefreshToken.for_user(user)
 
        response = Response(
            {
                'user': UserProfileSerializer(user).data,
                'message': 'User login successfully',
            },
            status=status.HTTP_200_OK,
        )
        _set_auth_cookies(response, refresh)
        return response
 
 
# ── Выход ──────────────────────────────────────────────────────────────────────
 
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """Выход пользователя — blacklist refresh из cookie или тела запроса"""
    # Сначала ищем refresh в cookie, затем в теле (обратная совместимость)
    raw_refresh = request.COOKIES.get(REFRESH_COOKIE) or request.data.get('refresh_token')
    if raw_refresh:
        try:
            token = RefreshToken(raw_refresh)
            token.blacklist()
        except Exception:
            pass  # Токен уже недействителен — всё равно удаляем cookie
 
    response = Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    _delete_auth_cookies(response)
    return response
 
 
# ── Обновление токена ──────────────────────────────────────────────────────────
 
class CookieTokenRefreshView(APIView):
    """
    Обновление access-токена по refresh из HttpOnly cookie.
    Заменяет стандартный TokenRefreshView из simplejwt,
    который ожидает refresh в теле запроса.
    """
    permission_classes = [permissions.AllowAny]
 
    def post(self, request):
        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not raw_refresh:
            return Response(
                {'detail': 'Refresh-токен отсутствует.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
 
        try:
            refresh = RefreshToken(raw_refresh)
        except (TokenError, InvalidToken) as e:
            return Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
 
        response = Response({'detail': 'Токен обновлён.'}, status=status.HTTP_200_OK)
 
        if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS'):
            _set_auth_cookies(response, refresh)
        else:
            access_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
            response.set_cookie(
                ACCESS_COOKIE,
                str(refresh.access_token),
                max_age=int(access_lifetime.total_seconds()),
                httponly=True,
                secure=COOKIE_SECURE,
                samesite=COOKIE_SAMESITE,
                path='/',
            )
        return response
 
 
# ── Профиль ────────────────────────────────────────────────────────────────────
 
class ProfileView(generics.RetrieveUpdateAPIView):
    """Просмотр и обновление профиля"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
 
    def get_object(self):
        return self.request.user
 
    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserProfileSerializer
 
 
# ── Смена пароля ───────────────────────────────────────────────────────────────
 
class ChangePasswordView(generics.UpdateAPIView):
    """Смена пароля"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]
 
    def get_object(self):
        return self.request.user
 
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)