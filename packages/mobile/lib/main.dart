import 'package:flutter/material.dart';
import 'app/auth/login_view.dart';
import 'app/auth/login_view_model.dart';
import 'app/home/home_view.dart';
import 'core/theme/app_theme.dart';
import 'domain/models/auth_user.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final LoginViewModel _loginViewModel;
  AuthUser? _authenticatedUser;

  @override
  void initState() {
    super.initState();
    _loginViewModel = LoginViewModel();
  }

  @override
  void dispose() {
    _loginViewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agrolify',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: _authenticatedUser != null
          ? HomeView(
              user: _authenticatedUser!,
              onLogout: () {
                setState(() {
                  _authenticatedUser = null;
                });
              },
            )
          : LoginView(
              viewModel: _loginViewModel,
              onLoginSuccess: () {
                setState(() {
                  _authenticatedUser = _loginViewModel.loggedUser;
                });
              },
            ),
    );
  }
}
