import 'package:flutter/foundation.dart';
import '../../domain/models/session.dart';
import '../../domain/usecases/login_usecase.dart';

class LoginViewModel extends ChangeNotifier {
  LoginViewModel({required LoginUseCase loginUseCase})
      : _loginUseCase = loginUseCase;

  final LoginUseCase _loginUseCase;

  String _email = '';
  String get email => _email;

  String _password = '';
  String get password => _password;

  String _selectedFirmaId = 'eliggi';
  String get selectedFirmaId => _selectedFirmaId;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _obscurePassword = true;
  bool get obscurePassword => _obscurePassword;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  String? _emailError;
  String? get emailError => _emailError;

  String? _passwordError;
  String? get passwordError => _passwordError;

  bool _isLoggedIn = false;
  bool get isLoggedIn => _isLoggedIn;

  Session? _session;
  Session? get session => _session;

  void setEmail(String value) {
    _email = value.trim();
    if (_emailError != null) {
      _emailError = null;
      notifyListeners();
    }
  }

  void setPassword(String value) {
    _password = value;
    if (_passwordError != null) {
      _passwordError = null;
      notifyListeners();
    }
  }

  void setSelectedFirmaId(String id) {
    _selectedFirmaId = id;
    notifyListeners();
  }

  void toggleObscurePassword() {
    _obscurePassword = !_obscurePassword;
    notifyListeners();
  }

  bool validateInputs() {
    bool isValid = true;
    _emailError = null;
    _passwordError = null;
    _errorMessage = null;

    if (_email.isEmpty) {
      _emailError = 'El email es requerido';
      isValid = false;
    } else if (!_email.contains('@') || !_email.contains('.')) {
      _emailError = 'Ingrese un email válido';
      isValid = false;
    }

    if (_password.isEmpty) {
      _passwordError = 'La contraseña es requerida';
      isValid = false;
    } else if (_password.length < 6) {
      _passwordError = 'La contraseña debe tener al menos 6 caracteres';
      isValid = false;
    }

    notifyListeners();
    return isValid;
  }

  Future<bool> login() async {
    if (!validateInputs()) {
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final session = await _loginUseCase.execute(
        email: _email,
        password: _password,
      );

      _session = session;
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
