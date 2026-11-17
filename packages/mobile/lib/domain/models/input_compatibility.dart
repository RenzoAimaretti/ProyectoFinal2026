/// Advisory only: never remove an input from the picker or prevent saving.
/// An empty labour set is unrestricted; an unknown input category is allowed.
bool isInputCompatible(String? categoryId, Set<String> admittedCategoryIds) =>
    admittedCategoryIds.isEmpty ||
    categoryId == null ||
    admittedCategoryIds.contains(categoryId);
