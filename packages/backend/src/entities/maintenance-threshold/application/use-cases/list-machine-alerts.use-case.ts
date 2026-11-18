import { AlertMachineReaderPort, AlertUsageReaderPort, ThresholdRepositoryPort } from '../threshold.ports';
import { validScope } from '../threshold.validation';

export class ListMachineAlertsUseCase {
  constructor(
    private readonly machines: AlertMachineReaderPort,
    private readonly thresholds: ThresholdRepositoryPort,
    private readonly usages: AlertUsageReaderPort,
  ) {}
  async execute(companyId: string) {
    const company = validScope(companyId, 'companyId');
    const [machines, thresholds, totals] = await Promise.all([
      this.machines.findAllByCompanyId(company),
      this.thresholds.findAll(company),
      this.usages.totalsForCompany(company),
    ]);
    // Machine types are free text: compare trimmed and case-insensitively so a
    // threshold configured as "Tractor" still applies to a machine typed "tractor".
    const typeKey = (value: string) => value.trim().toLocaleLowerCase('es');
    const limitsByType = new Map(
      thresholds
        .filter(row => row.companyId === company && row.machineType.trim())
        .map(row => [typeKey(row.machineType), row]),
    );
    const totalsByMachine = new Map(totals.map(row => [row.machineId, row]));
    return machines.filter(machine => machine.companyId === company).map(machine => {
      const limits = machine.type && machine.type.trim()
        ? limitsByType.get(typeKey(machine.type))
        : undefined;
      const usage = totalsByMachine.get(machine.id);
      const usageHours = usage?.usageHours ?? 0;
      const hectares = usage?.hectares ?? 0;
      const hoursLimit = limits?.hoursLimit ?? null;
      const hectaresLimit = limits?.hectaresLimit ?? null;
      const reasons: Array<'HOURS' | 'HECTARES'> = [];
      if (hoursLimit !== null && usageHours >= hoursLimit) reasons.push('HOURS');
      if (hectaresLimit !== null && hectares >= hectaresLimit) reasons.push('HECTARES');
      return { ...machine, usageHours, hectares, hoursLimit, hectaresLimit, due: reasons.length > 0, reasons };
    });
  }
}
