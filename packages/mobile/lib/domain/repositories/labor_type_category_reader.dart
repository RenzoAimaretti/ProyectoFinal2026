import 'dart:async';

abstract class LaborTypeCategoryReader {
  Stream<Set<String>> watchCategoryIds(String laborTypeId);
}
