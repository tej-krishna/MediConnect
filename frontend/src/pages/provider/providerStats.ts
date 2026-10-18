import type { Order, Medicine } from '../../types/pharmacy';
import type { DiagnosticOrder, DiagnosticTest, HealthCamp } from '../../types/diagnostics';
import type { CareRequest, CareOffering } from '../../types/homecare';
import type { Appointment, Slot } from '../../types/scheduling';
import type { OwnerProviderApplication } from '../../types/provider';

export interface ProviderStats {
  revenueLabel: string;
  revenue: number | null;
  openLabel: string;
  openCount: number;
  totalLabel: string;
  totalCount: number;
  note: string | null;
}

const LOW_STOCK_THRESHOLD = 10;

export function computeProviderStats(application: OwnerProviderApplication, data: {
  pharmacyOrders: Order[];
  medicines: Medicine[];
  labOrders: DiagnosticOrder[];
  tests: DiagnosticTest[];
  careRequests: CareRequest[];
  offerings: CareOffering[];
  appointments: Appointment[];
  slots: Slot[];
  camps: HealthCamp[];
}): ProviderStats {
  switch (application.providerType) {
    case 'pharmacy': {
      const delivered = data.pharmacyOrders.filter((o) => o.status === 'delivered');
      const open = data.pharmacyOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
      const lowStock = data.medicines.filter((m) => m.stockQuantity > 0 && m.stockQuantity < LOW_STOCK_THRESHOLD).length;
      return {
        revenueLabel: 'Revenue from delivered orders',
        revenue: delivered.reduce((sum, o) => sum + o.totalAmount, 0),
        openLabel: 'Orders in progress',
        openCount: open.length,
        totalLabel: 'Medicines in inventory',
        totalCount: data.medicines.length,
        note: lowStock > 0 ? `${lowStock} medicine${lowStock === 1 ? '' : 's'} running low on stock` : null,
      };
    }
    case 'diagnostic_lab': {
      const completed = data.labOrders.filter((o) => o.status === 'report_ready');
      const open = data.labOrders.filter((o) => !['report_ready', 'cancelled'].includes(o.status));
      return {
        revenueLabel: 'Revenue from completed bookings',
        revenue: completed.reduce((sum, o) => sum + o.totalAmount, 0),
        openLabel: 'Bookings in progress',
        openCount: open.length,
        totalLabel: 'Tests in catalogue',
        totalCount: data.tests.length,
        note: null,
      };
    }
    case 'equipment_provider': {
      const completed = data.careRequests.filter((r) => ['completed', 'returned'].includes(r.status));
      const open = data.careRequests.filter((r) => !['completed', 'returned', 'cancelled'].includes(r.status));
      return {
        revenueLabel: 'Revenue from fulfilled requests',
        revenue: completed.reduce((sum, r) => sum + r.totalAmount, 0),
        openLabel: 'Requests in progress',
        openCount: open.length,
        totalLabel: 'Active offerings',
        totalCount: data.offerings.filter((o) => o.isActive).length,
        note: null,
      };
    }
    case 'doctor':
    case 'hospital':
    case 'clinic': {
      const completed = data.appointments.filter((a) => a.status === 'completed');
      const booked = data.appointments.filter((a) => a.status === 'booked');
      const fee = application.consultationFee ?? 0;
      return {
        revenueLabel: 'Revenue from completed appointments',
        revenue: completed.length * fee,
        openLabel: 'Upcoming appointments',
        openCount: booked.length,
        totalLabel: 'Open slots',
        totalCount: data.slots.filter((s) => s.status === 'open').length,
        note: null,
      };
    }
    case 'mobile_van_operator':
    case 'ngo_coordinator': {
      const scheduled = data.camps.filter((c) => c.status === 'scheduled');
      return {
        revenueLabel: 'Revenue',
        revenue: null,
        openLabel: 'Upcoming camps',
        openCount: scheduled.length,
        totalLabel: 'People registered',
        totalCount: data.camps.reduce((sum, c) => sum + c.registeredCount, 0),
        note: 'Health camps aren’t billed through MediConnect, so no revenue figure applies here.',
      };
    }
    case 'ambulance_provider': {
      return {
        revenueLabel: 'Revenue',
        revenue: null,
        openLabel: '',
        openCount: 0,
        totalLabel: '',
        totalCount: 0,
        note: 'Ambulance bookings aren’t tracked through MediConnect yet — keep your availability up to date in Listing settings.',
      };
    }
    default:
      return {
        revenueLabel: 'Revenue',
        revenue: null,
        openLabel: '',
        openCount: 0,
        totalLabel: '',
        totalCount: 0,
        note: null,
      };
  }
}
