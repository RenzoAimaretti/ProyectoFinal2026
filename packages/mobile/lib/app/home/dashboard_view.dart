import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/session.dart';
import '../../presentation/components/badges/sync_pending_badge.dart';
import '../machinery/machine_activities_view.dart';
import '../machinery/machine_activities_view_model.dart';
import '../machinery/machine_activity_form_view.dart';
import '../machinery/machine_activity_form_view_model.dart';
import '../receptions/reception_form_view.dart';
import '../receptions/reception_form_view_model.dart';
import '../receptions/receptions_view.dart';
import '../receptions/receptions_view_model.dart';
import '../reports/daily_report_form_view.dart';
import '../reports/daily_report_form_view_model.dart';
import '../reports/daily_reports_view.dart';
import '../reports/daily_reports_view_model.dart';

/// Dashboard principal post-login: navegación inferior a los 3 módulos
/// (Partes, Recepciones, Maquinaria). Los tres módulos están cableados a su
/// lista y formulario reales (CUU05/06/08).
class DashboardView extends StatefulWidget {
  const DashboardView({
    super.key,
    required this.session,
    required this.pendingSyncCount,
    required this.onLogout,
    required this.dailyReportsViewModel,
    required this.dailyReportFormViewModel,
    required this.receptionsViewModel,
    required this.receptionFormViewModel,
    required this.machineActivitiesViewModel,
    required this.machineActivityFormViewModel,
  });

  final Session session;

  /// Cantidad de operaciones pendientes de sincronización (`SyncQueue`).
  final Stream<int> pendingSyncCount;

  final VoidCallback onLogout;

  final DailyReportsViewModel dailyReportsViewModel;
  final DailyReportFormViewModel dailyReportFormViewModel;
  final ReceptionsViewModel receptionsViewModel;
  final ReceptionFormViewModel receptionFormViewModel;
  final MachineActivitiesViewModel machineActivitiesViewModel;
  final MachineActivityFormViewModel machineActivityFormViewModel;

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  int _selectedIndex = 0;

  void _showComingSoon() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(content: Text('Próximamente')),
      );
  }

  void _onFabPressed() {
    if (_selectedIndex == 0) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DailyReportFormView(
            viewModel: widget.dailyReportFormViewModel,
            operatorId: widget.session.userId,
            initialCompanyId: widget.session.companyId,
          ),
        ),
      );
      return;
    }
    if (_selectedIndex == 1) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ReceptionFormView(
            viewModel: widget.receptionFormViewModel,
          ),
        ),
      );
      return;
    }
    if (_selectedIndex == 2) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => MachineActivityFormView(
            viewModel: widget.machineActivityFormViewModel,
          ),
        ),
      );
      return;
    }
    _showComingSoon();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.agriculture_rounded, color: AppColors.onPrimary),
            SizedBox(width: 8),
            Text('Agrolify', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          SyncPendingBadge(pendingCount: widget.pendingSyncCount),
          const SizedBox(width: 4),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Cerrar sesión',
            onPressed: widget.onLogout,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          DailyReportsView(viewModel: widget.dailyReportsViewModel),
          ReceptionsView(
            viewModel: widget.receptionsViewModel,
            operatorId: widget.session.userId,
          ),
          MachineActivitiesView(viewModel: widget.machineActivitiesViewModel),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _onFabPressed,
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Partes',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Recepciones',
          ),
          NavigationDestination(
            icon: Icon(Icons.agriculture_outlined),
            selectedIcon: Icon(Icons.agriculture),
            label: 'Maquinaria',
          ),
        ],
      ),
    );
  }
}
