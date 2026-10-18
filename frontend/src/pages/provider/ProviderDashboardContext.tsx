import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  getMyApplication,
  uploadDocument,
  submitApplication,
  updateListingInfo,
  setAvailability,
} from '../../services/providerService';
import {
  createSlot,
  listProviderSlots,
  cancelSlot,
  listProviderAppointments,
} from '../../services/schedulingService';
import {
  createMedicineItem,
  listPharmacyMedicines,
  updateMedicineItem,
  listPharmacyOrders,
  transitionOrder,
  assignDeliveryPartner,
} from '../../services/pharmacyService';
import {
  createTest,
  listLabTests,
  listLabOrders,
  transitionDiagnosticOrder,
  uploadReport,
  createCamp,
  listProviderCamps,
  cancelCamp,
} from '../../services/diagnosticsService';
import {
  createOffering,
  listProviderOfferings,
  updateOffering,
  listProviderCareRequests,
  transitionCareRequest,
} from '../../services/homecareService';
import { listDeliveryPartnerDirectory } from '../../services/deliveryService';
import { ApiError } from '../../services/apiClient';
import type { OwnerProviderApplication } from '../../types/provider';
import type { Slot, Appointment } from '../../types/scheduling';
import type { Medicine, Order } from '../../types/pharmacy';
import type { DiagnosticTest, DiagnosticOrder, HealthCamp } from '../../types/diagnostics';
import type { CareOffering, CareRequest, OfferingType } from '../../types/homecare';
import type { DeliveryPartnerDirectoryEntry } from '../../types/delivery';
import { getProviderTypeConfig, type ProviderTypeConfig } from './providerTypeConfig';

// diagnostic_lab deliberately excluded: labs book through their own DiagnosticOrder flow
// (collection method + preferred time tied to specific tests), not the generic Slot/Appointment
// system doctors/hospitals/clinics use.
const SCHEDULING_TYPES = new Set(['doctor', 'hospital', 'clinic']);
const CAMP_TYPES = new Set(['mobile_van_operator', 'ngo_coordinator']);

interface ProviderDashboardState {
  application: OwnerProviderApplication | null;
  config: ProviderTypeConfig;
  loading: boolean;
  error: string | null;
  message: string | null;
  setError: (error: string | null) => void;
  reload: () => Promise<void>;

  documentType: string;
  setDocumentType: (value: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  uploading: boolean;
  handleUpload: (e: FormEvent) => Promise<void>;
  handleSubmitForReview: () => Promise<void>;

  fee: string;
  setFee: (value: string) => void;
  hoursNote: string;
  setHoursNote: (value: string) => void;
  savingListing: boolean;
  handleSaveListing: (e: FormEvent) => Promise<void>;

  togglingAvailability: boolean;
  handleToggleAvailability: () => Promise<void>;

  slots: Slot[];
  slotDate: string;
  setSlotDate: (value: string) => void;
  slotStart: string;
  setSlotStart: (value: string) => void;
  slotEnd: string;
  setSlotEnd: (value: string) => void;
  slotCapacity: string;
  setSlotCapacity: (value: string) => void;
  creatingSlot: boolean;
  handleCreateSlot: (e: FormEvent) => Promise<void>;
  handleCancelSlot: (slotId: string) => Promise<void>;
  appointments: Appointment[];

  medicines: Medicine[];
  medName: string;
  setMedName: (value: string) => void;
  medGeneric: string;
  setMedGeneric: (value: string) => void;
  medIngredient: string;
  setMedIngredient: (value: string) => void;
  medStrength: string;
  setMedStrength: (value: string) => void;
  medForm: string;
  setMedForm: (value: string) => void;
  medPrice: string;
  setMedPrice: (value: string) => void;
  medStock: string;
  setMedStock: (value: string) => void;
  medRx: boolean;
  setMedRx: (value: boolean) => void;
  creatingMedicine: boolean;
  handleCreateMedicine: (e: FormEvent) => Promise<void>;
  handleStockChange: (medicineId: string, stockQuantity: number) => Promise<void>;
  pharmacyOrders: Order[];
  handleOrderAction: (orderId: string, action: string) => Promise<void>;
  deliveryDirectory: DeliveryPartnerDirectoryEntry[];
  selectedDeliveryPartner: Record<string, string>;
  setSelectedDeliveryPartner: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  handleAssignDeliveryPartner: (orderId: string) => Promise<void>;

  tests: DiagnosticTest[];
  testName: string;
  setTestName: (value: string) => void;
  testCategory: string;
  setTestCategory: (value: string) => void;
  testSampleType: string;
  setTestSampleType: (value: string) => void;
  testPrice: string;
  setTestPrice: (value: string) => void;
  testTurnaround: string;
  setTestTurnaround: (value: string) => void;
  testHomeCollection: boolean;
  setTestHomeCollection: (value: boolean) => void;
  creatingTest: boolean;
  handleCreateTest: (e: FormEvent) => Promise<void>;
  labOrders: DiagnosticOrder[];
  scheduleDateTimes: Record<string, string>;
  setScheduleDateTimes: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  handleDiagnosticAction: (orderId: string, action: string, preferredDateTime?: string) => Promise<void>;
  handleReportUpload: (orderId: string, reportFile: File | null) => Promise<void>;

  camps: HealthCamp[];
  campTitle: string;
  setCampTitle: (value: string) => void;
  campLocation: string;
  setCampLocation: (value: string) => void;
  campDate: string;
  setCampDate: (value: string) => void;
  campStart: string;
  setCampStart: (value: string) => void;
  campEnd: string;
  setCampEnd: (value: string) => void;
  campCapacity: string;
  setCampCapacity: (value: string) => void;
  creatingCamp: boolean;
  handleCreateCamp: (e: FormEvent) => Promise<void>;
  handleCancelCamp: (campId: string) => Promise<void>;

  offerings: CareOffering[];
  offeringName: string;
  setOfferingName: (value: string) => void;
  offeringCategory: string;
  setOfferingCategory: (value: string) => void;
  offeringType: OfferingType;
  setOfferingType: (value: OfferingType) => void;
  offeringPrice: string;
  setOfferingPrice: (value: string) => void;
  offeringQuantity: string;
  setOfferingQuantity: (value: string) => void;
  creatingOffering: boolean;
  handleCreateOffering: (e: FormEvent) => Promise<void>;
  handleToggleOfferingActive: (offeringId: string, isActive: boolean) => Promise<void>;
  careRequests: CareRequest[];
  handleCareRequestAction: (requestId: string, action: string) => Promise<void>;
}

const ProviderDashboardCtx = createContext<ProviderDashboardState | null>(null);

export function ProviderDashboardProvider({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<OwnerProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState('registration_certificate');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [fee, setFee] = useState('');
  const [hoursNote, setHoursNote] = useState('');
  const [savingListing, setSavingListing] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('1');
  const [creatingSlot, setCreatingSlot] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medName, setMedName] = useState('');
  const [medGeneric, setMedGeneric] = useState('');
  const [medIngredient, setMedIngredient] = useState('');
  const [medStrength, setMedStrength] = useState('');
  const [medForm, setMedForm] = useState('tablet');
  const [medPrice, setMedPrice] = useState('');
  const [medStock, setMedStock] = useState('');
  const [medRx, setMedRx] = useState(false);
  const [creatingMedicine, setCreatingMedicine] = useState(false);
  const [pharmacyOrders, setPharmacyOrders] = useState<Order[]>([]);

  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [testName, setTestName] = useState('');
  const [testCategory, setTestCategory] = useState('');
  const [testSampleType, setTestSampleType] = useState('');
  const [testPrice, setTestPrice] = useState('');
  const [testTurnaround, setTestTurnaround] = useState('24');
  const [testHomeCollection, setTestHomeCollection] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [labOrders, setLabOrders] = useState<DiagnosticOrder[]>([]);
  const [scheduleDateTimes, setScheduleDateTimes] = useState<Record<string, string>>({});

  const [camps, setCamps] = useState<HealthCamp[]>([]);
  const [campTitle, setCampTitle] = useState('');
  const [campLocation, setCampLocation] = useState('');
  const [campDate, setCampDate] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [campCapacity, setCampCapacity] = useState('20');
  const [creatingCamp, setCreatingCamp] = useState(false);

  const [offerings, setOfferings] = useState<CareOffering[]>([]);
  const [offeringName, setOfferingName] = useState('');
  const [offeringCategory, setOfferingCategory] = useState('');
  const [offeringType, setOfferingType] = useState<OfferingType>('equipment_rental');
  const [offeringPrice, setOfferingPrice] = useState('');
  const [offeringQuantity, setOfferingQuantity] = useState('');
  const [creatingOffering, setCreatingOffering] = useState(false);
  const [careRequests, setCareRequests] = useState<CareRequest[]>([]);

  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const [deliveryDirectory, setDeliveryDirectory] = useState<DeliveryPartnerDirectoryEntry[]>([]);
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const app = await getMyApplication(id);
      setApplication(app);
      setFee(app.consultationFee !== null ? String(app.consultationFee) : '');
      setHoursNote(app.operatingHoursNote ?? '');
      if (app.status === 'approved' && SCHEDULING_TYPES.has(app.providerType)) {
        const [slotList, appointmentList] = await Promise.all([
          listProviderSlots(id),
          listProviderAppointments(id),
        ]);
        setSlots(slotList);
        setAppointments(appointmentList);
      }
      if (app.status === 'approved' && app.providerType === 'pharmacy') {
        const [medicineList, orderList, directory] = await Promise.all([
          listPharmacyMedicines(id),
          listPharmacyOrders(id),
          listDeliveryPartnerDirectory(),
        ]);
        setMedicines(medicineList);
        setPharmacyOrders(orderList);
        setDeliveryDirectory(directory);
      }
      if (app.status === 'approved' && app.providerType === 'equipment_provider') {
        const [offeringList, requestList] = await Promise.all([
          listProviderOfferings(id),
          listProviderCareRequests(id),
        ]);
        setOfferings(offeringList);
        setCareRequests(requestList);
      }
      if (app.status === 'approved' && app.providerType === 'diagnostic_lab') {
        const [testList, orderList] = await Promise.all([listLabTests(id), listLabOrders(id)]);
        setTests(testList);
        setLabOrders(orderList);
      }
      if (app.status === 'approved' && CAMP_TYPES.has(app.providerType)) {
        setCamps(await listProviderCamps(id));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this application.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!id || !file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(id, documentType, file);
      setFile(null);
      setMessage('Document uploaded.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!id) return;
    setError(null);
    try {
      await submitApplication(id);
      setMessage('Application submitted for review.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit.');
    }
  }

  async function handleSaveListing(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingListing(true);
    setError(null);
    try {
      await updateListingInfo(id, {
        consultationFee: fee ? Number(fee) : undefined,
        operatingHoursNote: hoursNote || undefined,
      });
      setMessage('Listing details updated.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSavingListing(false);
    }
  }

  async function handleToggleAvailability() {
    if (!id || !application) return;
    setTogglingAvailability(true);
    setError(null);
    try {
      await setAvailability(id, !application.isCurrentlyAvailable);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update availability.');
    } finally {
      setTogglingAvailability(false);
    }
  }

  async function handleCreateSlot(e: FormEvent) {
    e.preventDefault();
    if (!id || !slotDate || !slotStart || !slotEnd) return;
    setCreatingSlot(true);
    setError(null);
    try {
      await createSlot(id, {
        startTime: new Date(`${slotDate}T${slotStart}`).toISOString(),
        endTime: new Date(`${slotDate}T${slotEnd}`).toISOString(),
        capacity: Number(slotCapacity) || 1,
      });
      setMessage('Slot created.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create slot.');
    } finally {
      setCreatingSlot(false);
    }
  }

  async function handleCancelSlot(slotId: string) {
    if (!id) return;
    setError(null);
    try {
      await cancelSlot(id, slotId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel slot.');
    }
  }

  async function handleCreateMedicine(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setCreatingMedicine(true);
    setError(null);
    try {
      await createMedicineItem(id, {
        name: medName,
        genericName: medGeneric,
        activeIngredient: medIngredient,
        strength: medStrength,
        dosageForm: medForm,
        manufacturer: null,
        unitPrice: Number(medPrice) || 0,
        stockQuantity: Number(medStock) || 0,
        requiresPrescription: medRx,
      });
      setMedName('');
      setMedGeneric('');
      setMedIngredient('');
      setMedStrength('');
      setMedPrice('');
      setMedStock('');
      setMedRx(false);
      setMessage('Medicine added to inventory.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add medicine.');
    } finally {
      setCreatingMedicine(false);
    }
  }

  async function handleStockChange(medicineId: string, stockQuantity: number) {
    if (!id) return;
    try {
      await updateMedicineItem(id, medicineId, { stockQuantity });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update stock.');
    }
  }

  async function handleOrderAction(orderId: string, action: string) {
    setError(null);
    try {
      await transitionOrder(orderId, action);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update order status.');
    }
  }

  async function handleCreateTest(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setCreatingTest(true);
    setError(null);
    try {
      await createTest(id, {
        name: testName,
        category: testCategory,
        sampleType: testSampleType,
        price: Number(testPrice) || 0,
        turnaroundHours: Number(testTurnaround) || 24,
        homeCollectionAvailable: testHomeCollection,
      });
      setTestName('');
      setTestCategory('');
      setTestSampleType('');
      setTestPrice('');
      setTestHomeCollection(false);
      setMessage('Test added to catalogue.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add test.');
    } finally {
      setCreatingTest(false);
    }
  }

  async function handleDiagnosticAction(orderId: string, action: string, preferredDateTime?: string) {
    setError(null);
    try {
      if (action === 'schedule') {
        const chosen = scheduleDateTimes[orderId];
        const confirmedDateTime = chosen ? new Date(chosen).toISOString() : preferredDateTime;
        if (!confirmedDateTime) {
          setError('Pick a date and time to confirm first.');
          return;
        }
        await transitionDiagnosticOrder(orderId, { action, confirmedDateTime });
      } else {
        await transitionDiagnosticOrder(orderId, { action });
      }
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this booking.');
    }
  }

  async function handleReportUpload(orderId: string, reportFile: File | null) {
    if (!reportFile) return;
    setError(null);
    try {
      await uploadReport(orderId, reportFile);
      setMessage('Report uploaded.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload the report.');
    }
  }

  async function handleCreateCamp(e: FormEvent) {
    e.preventDefault();
    if (!id || !campDate || !campStart || !campEnd) return;
    setCreatingCamp(true);
    setError(null);
    try {
      await createCamp(id, {
        title: campTitle,
        locationDescription: campLocation,
        scheduledDate: new Date(campDate).toISOString(),
        startTime: campStart,
        endTime: campEnd,
        servicesOffered: [],
        capacity: Number(campCapacity) || 1,
      });
      setCampTitle('');
      setCampLocation('');
      setMessage('Camp scheduled.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not schedule camp.');
    } finally {
      setCreatingCamp(false);
    }
  }

  async function handleCancelCamp(campId: string) {
    if (!id) return;
    setError(null);
    try {
      await cancelCamp(id, campId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel camp.');
    }
  }

  async function handleCreateOffering(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setCreatingOffering(true);
    setError(null);
    try {
      await createOffering(id, {
        name: offeringName,
        category: offeringCategory,
        offeringType,
        price: Number(offeringPrice) || 0,
        availableQuantity: offeringType === 'home_visit_service' ? null : Number(offeringQuantity) || 0,
      });
      setOfferingName('');
      setOfferingCategory('');
      setOfferingPrice('');
      setOfferingQuantity('');
      setMessage('Offering added.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add offering.');
    } finally {
      setCreatingOffering(false);
    }
  }

  async function handleToggleOfferingActive(offeringId: string, isActive: boolean) {
    if (!id) return;
    setError(null);
    try {
      await updateOffering(id, offeringId, { isActive });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update offering.');
    }
  }

  async function handleCareRequestAction(requestId: string, action: string) {
    setError(null);
    try {
      await transitionCareRequest(requestId, action);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this request.');
    }
  }

  async function handleAssignDeliveryPartner(orderId: string) {
    const deliveryPartnerUserId = selectedDeliveryPartner[orderId];
    if (!deliveryPartnerUserId) return;
    setError(null);
    try {
      await assignDeliveryPartner(orderId, deliveryPartnerUserId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not assign a delivery partner.');
    }
  }

  const value: ProviderDashboardState = {
    application,
    config: getProviderTypeConfig(application?.providerType ?? ''),
    loading,
    error,
    message,
    setError,
    reload,

    documentType,
    setDocumentType,
    file,
    setFile,
    uploading,
    handleUpload,
    handleSubmitForReview,

    fee,
    setFee,
    hoursNote,
    setHoursNote,
    savingListing,
    handleSaveListing,

    togglingAvailability,
    handleToggleAvailability,

    slots,
    slotDate,
    setSlotDate,
    slotStart,
    setSlotStart,
    slotEnd,
    setSlotEnd,
    slotCapacity,
    setSlotCapacity,
    creatingSlot,
    handleCreateSlot,
    handleCancelSlot,
    appointments,

    medicines,
    medName,
    setMedName,
    medGeneric,
    setMedGeneric,
    medIngredient,
    setMedIngredient,
    medStrength,
    setMedStrength,
    medForm,
    setMedForm,
    medPrice,
    setMedPrice,
    medStock,
    setMedStock,
    medRx,
    setMedRx,
    creatingMedicine,
    handleCreateMedicine,
    handleStockChange,
    pharmacyOrders,
    handleOrderAction,
    deliveryDirectory,
    selectedDeliveryPartner,
    setSelectedDeliveryPartner,
    handleAssignDeliveryPartner,

    tests,
    testName,
    setTestName,
    testCategory,
    setTestCategory,
    testSampleType,
    setTestSampleType,
    testPrice,
    setTestPrice,
    testTurnaround,
    setTestTurnaround,
    testHomeCollection,
    setTestHomeCollection,
    creatingTest,
    handleCreateTest,
    labOrders,
    scheduleDateTimes,
    setScheduleDateTimes,
    handleDiagnosticAction,
    handleReportUpload,

    camps,
    campTitle,
    setCampTitle,
    campLocation,
    setCampLocation,
    campDate,
    setCampDate,
    campStart,
    setCampStart,
    campEnd,
    setCampEnd,
    campCapacity,
    setCampCapacity,
    creatingCamp,
    handleCreateCamp,
    handleCancelCamp,

    offerings,
    offeringName,
    setOfferingName,
    offeringCategory,
    setOfferingCategory,
    offeringType,
    setOfferingType,
    offeringPrice,
    setOfferingPrice,
    offeringQuantity,
    setOfferingQuantity,
    creatingOffering,
    handleCreateOffering,
    handleToggleOfferingActive,
    careRequests,
    handleCareRequestAction,
  };

  return <ProviderDashboardCtx.Provider value={value}>{children}</ProviderDashboardCtx.Provider>;
}

export function useProviderDashboard() {
  const ctx = useContext(ProviderDashboardCtx);
  if (!ctx) {
    throw new Error('useProviderDashboard must be used within a ProviderDashboardProvider');
  }
  return ctx;
}
