import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../components/empty_state.dart';

/// Prototipo del shell de navegación principal (dashboard) de Agrolify.
///
/// `Scaffold` con `BottomNavigationBar` de 3 pestañas ("Inicio",
/// "Partes", "Perfil"). Cada cuerpo es un placeholder [EmptyState]
/// y el cambio de pestaña se maneja con `setState`. Visual only:
/// no hay navegación real ni datos.
class BottomNavShell extends StatefulWidget {
  const BottomNavShell({super.key});

  @override
  State<BottomNavShell> createState() => _BottomNavShellState();
}

class _BottomNavShellState extends State<BottomNavShell> {
  int _currentIndex = 0;

  static const List<EmptyState> _bodies = [
    EmptyState(
      icon: Icons.home_outlined,
      title: 'Inicio',
      subtitle: 'Dashboard y accesos rápidos a las tareas del operario.',
    ),
    EmptyState(
      icon: Icons.assignment_outlined,
      title: 'Partes',
      subtitle: 'Partes diarios y recepciones de insumos.',
    ),
    EmptyState(
      icon: Icons.person_outline,
      title: 'Perfil',
      subtitle: 'Datos del operario y estado de sesión.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _bodies[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.onSurfaceVariant,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            label: 'Inicio',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.assignment_outlined),
            label: 'Partes',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
