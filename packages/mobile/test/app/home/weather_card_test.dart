import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/home/dashboard_view.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/models/weather_reading.dart';

/// 11.3 — Widget test de la tarjeta de clima: viento en nudos + timestamp.
Widget _wrap(Widget child) => MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: child),
    );

WeatherReading _reading({bool stale = false}) => WeatherReading(
      temperatureC: 18.4,
      windSpeedKnots: 12.5,
      windDirectionDeg: 156,
      precipitationMm: 0.1,
      precipitationProbabilityMax: 10,
      fetchedAt: DateTime(2026, 10, 15, 14, 30),
      stale: stale,
      resolvedFrom: 'lot',
    );

void main() {
  testWidgets('muestra el viento en nudos y el timestamp de la lectura',
      (tester) async {
    await tester.pumpWidget(_wrap(WeatherCard(reading: _reading())));

    expect(find.textContaining('12.5 kn'), findsOneWidget);
    expect(find.textContaining('156°'), findsOneWidget);
    expect(find.textContaining('15/10 14:30'), findsOneWidget);
    expect(find.text('Dato desactualizado'), findsNothing);
  });

  testWidgets('marca el dato stale para no presentarlo como fresco',
      (tester) async {
    await tester.pumpWidget(_wrap(WeatherCard(reading: _reading(stale: true))));

    expect(find.text('Dato desactualizado'), findsOneWidget);
  });

  testWidgets('sin lectura local muestra el estado vacío', (tester) async {
    await tester.pumpWidget(_wrap(const WeatherCard(reading: null)));

    expect(find.text('Sin datos de clima'), findsOneWidget);
    expect(find.textContaining('kn'), findsNothing);
  });
}
