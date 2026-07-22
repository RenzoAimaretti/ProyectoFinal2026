import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'presentation/preview/components_preview_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agrolify',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const ComponentsPreviewScreen(),
    );
  }
}
