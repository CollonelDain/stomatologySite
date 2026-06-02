
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
 
 
ACCESS_COOKIE = getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
 
 
class CookieJWTAuthentication(JWTAuthentication):
    """
    Пробует взять токен сначала из cookie, затем из заголовка Authorization.
    Это позволяет использовать оба способа (браузер + API-клиент).
    """
 
    def authenticate(self, request):
        # 1. Пробуем cookie
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
 
        if raw_token:
            try:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token
            except (InvalidToken, TokenError) as e:
                raise AuthenticationFailed(str(e))
 
        # 2. Fallback — стандартный заголовок Authorization: Bearer <token>
        return super().authenticate(request)