import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  /// Retorna la URL base adecuada según la plataforma de ejecución.
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    if (Platform.isAndroid) {
      // 10.0.2.2 mapea a localhost de la máquina host en el emulador de Android
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
}
