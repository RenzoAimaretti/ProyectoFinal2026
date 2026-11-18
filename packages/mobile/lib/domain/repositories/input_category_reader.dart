import 'dart:async';
import '../models/catalogs.dart';

abstract class InputCategoryReader {
  Stream<List<InputCategory>> watchAll();
}
