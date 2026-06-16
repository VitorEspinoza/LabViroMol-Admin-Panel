export interface CreatedResponse {
  id: string;
}

// Materiais

export type MaterialUnit = 'Gram' | 'Milliliter' | 'Piece';

export interface Material {
  materialId: string;
  name: string;
  location: string;
  stockQuantity: number;
  minStock: number;
  unit: MaterialUnit;
  typeName: string;
  isLowStock: boolean;
}

export interface CreateMaterialRequest {
  name: string;
  location: string;
  minStock: number;
  stockQuantity: number;
  unit: MaterialUnit;
  typeId: string;
}

export interface UpdateMaterialRequest {
  name: string;
  location: string;
  minStock: number;
}

// Operações de Estoque

// POST /api/inventory/materials/{id}/add-stock — entrada avulsa de estoque
export interface AddStockEntryRequest {
  quantity: number;
  reason: string;
}

// POST /api/inventory/materials/{id}/add-stock — entrada manual de estoque
export interface StockExceptionRequest {
  quantity: number;
  reason: string | null;
}

// POST /api/inventory/materials/{id}/write-off (com projectId) — baixa de estoque para projeto
export interface ConsumeForProjectRequest {
  quantity: number;
  projectId: string;
  reason?: string | null;
}

// POST /api/inventory/materials/{id}/write-off (sem projectId) — remoção de estoque com justificativa
export interface RemoveStockRequest {
  quantity: number;
  reason: string | null;
}

// Tipos de Material

export interface MaterialType {
  id: string;
  name: string;
  active: boolean;
}

export interface CreateMaterialTypeRequest {
  name: string;
}

// Pedidos de Material

export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Canceled';

export interface OrderProcessing {
  processedBy: string;
  processedByName: string;
  processedAt: string;
  notes: string | null;
}

export interface OrderReceipt {
  receivedBy: string;
  receivedByName: string;
  receivedAt: string;
  quantityReceived: number;
  notes: string | null;
}

export interface Order {
  orderId: string;
  materialId: string;
  materialName: string;
  projectId: string;
  projectTitle: string;
  requestedQuantity: number;
  description: string | null;
  status: OrderStatus;
  processing: OrderProcessing | null;
  receipt: OrderReceipt | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateOrderRequest {
  materialId: string;
  projectId: string;
  quantity: number;
  description: string;
}

// PUT /api/inventory/orders/{id}/fix-details — apenas pedidos com status Pending
export interface UpdateOrderRequest {
  newProjectId: string;
  newQuantity: number;
  description: string;
}

export interface ProcessOrderRequest {
  notes: string | null;
}

export interface ReceiveOrderRequest {
  quantityReceived: number;
  notes: string | null;
}

// Kits

export interface KitItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: MaterialUnit;
}

export interface KitItemInput {
  id: string; // materialId
  quantity: number;
}

export interface Kit {
  kitId: string;
  name: string;
  description: string | null;
  materials: KitItem[];
}

export interface CreateKitRequest {
  name: string;
  description: string;
  materials: KitItemInput[];
}

export interface UpdateKitRequest {
  name: string;
  description: string;
  materials: KitItemInput[];
}
