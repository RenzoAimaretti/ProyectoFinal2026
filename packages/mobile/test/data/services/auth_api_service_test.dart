import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/data/services/auth_api_service.dart';

void main() {
  group('AuthApiService Unit Tests', () {
    test('login exitoso (HTTP 200) debe retornar LoginResponseModel', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/auth/login');
        expect(request.method, 'POST');
        final body = jsonDecode(request.body);
        expect(body['email'], 'admin@firma.com');
        expect(body['password'], 'Password123!');

        return http.Response(
          jsonEncode({
            'accessToken': 'jwt-acc-token',
            'refreshToken': 'jwt-ref-token',
            'user': {
              'id': 'user-123',
              'email': 'admin@firma.com',
              'role': 'ADMIN',
              'firmaId': 'company-123',
            },
          }),
          200,
        );
      });

      final service = AuthApiService(client: mockClient, baseUrl: 'http://test.api');
      final result = await service.login(email: 'admin@firma.com', password: 'Password123!');

      expect(result.accessToken, 'jwt-acc-token');
      expect(result.refreshToken, 'jwt-ref-token');
      expect(result.user.id, 'user-123');
      expect(result.user.email, 'admin@firma.com');
      expect(result.user.role, 'ADMIN');
      expect(result.user.firmaId, 'company-123');
    });

    test('login fallido (HTTP 401) debe lanzar AuthException', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'statusCode': 401, 'message': 'Usuario o contraseña incorrectos'}),
          401,
        );
      });

      final service = AuthApiService(client: mockClient, baseUrl: 'http://test.api');

      expect(
        () => service.login(email: 'admin@firma.com', password: 'WrongPassword'),
        throwsA(isA<AuthException>().having((e) => e.message, 'message', contains('Usuario o contraseña incorrectos'))),
      );
    });

    test('login bloqueado (HTTP 423) debe lanzar AccountLockedException', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'statusCode': 423,
            'message': 'Cuenta bloqueada temporalmente por exceso de intentos fallidos. Reintente en 15 minutos.',
            'remainingSeconds': 900,
          }),
          423,
        );
      });

      final service = AuthApiService(client: mockClient, baseUrl: 'http://test.api');

      expect(
        () => service.login(email: 'admin@firma.com', password: 'Password123!'),
        throwsA(isA<AccountLockedException>()
            .having((e) => e.message, 'message', contains('Cuenta bloqueada temporalmente'))
            .having((e) => e.remainingSeconds, 'remainingSeconds', 900)),
      );
    });

    test('refresh token exitoso (HTTP 200) debe retornar nuevo token', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/auth/refresh');
        return http.Response(
          jsonEncode({
            'accessToken': 'new-acc',
            'refreshToken': 'new-ref',
          }),
          200,
        );
      });

      final service = AuthApiService(client: mockClient, baseUrl: 'http://test.api');
      final res = await service.refresh('old-ref');

      expect(res['accessToken'], 'new-acc');
      expect(res['refreshToken'], 'new-ref');
    });
  });
}
