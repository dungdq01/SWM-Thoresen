import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShipmentLineResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lineNumber: number;

  @ApiPropertyOptional()
  soLineId?: string;

  @ApiProperty()
  itemId: string;

  @ApiProperty()
  itemCode?: string;

  @ApiProperty()
  itemName?: string;

  @ApiProperty()
  cargoForm: string;

  @ApiProperty()
  uomId: string;

  @ApiProperty()
  uomCode?: string;

  @ApiProperty()
  expectedQty: number;

  @ApiProperty()
  expectedQtyKg: number;

  @ApiProperty()
  allocatedQty: number;

  @ApiProperty()
  pickedQty: number;

  @ApiProperty()
  loadedQty: number;

  @ApiPropertyOptional()
  shippedQty?: number;

  @ApiPropertyOptional()
  bagCount?: number;

  @ApiPropertyOptional()
  nominalWeightPerBag?: number;

  @ApiPropertyOptional()
  tolerancePctApplied?: number;

  @ApiPropertyOptional()
  variancePct?: number;

  @ApiPropertyOptional()
  grossWeightKg?: number;

  @ApiPropertyOptional()
  netWeightKg?: number;

  @ApiPropertyOptional()
  weighSequenceNo?: number;

  @ApiProperty()
  lineStatus: string;

  @ApiPropertyOptional()
  postedTransId?: string;

  @ApiProperty()
  isDpmLine: boolean;

  @ApiPropertyOptional()
  dpmNominalQtyKg?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ShipmentHeaderResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  shipmentNumber?: string;

  @ApiPropertyOptional()
  soId?: string;

  @ApiProperty()
  sourceType: string;

  @ApiProperty()
  ownerId: string;

  @ApiPropertyOptional()
  ownerCode?: string;

  @ApiPropertyOptional()
  ownerName?: string;

  @ApiPropertyOptional()
  customerId?: string;

  @ApiProperty()
  warehouseId: string;

  @ApiPropertyOptional()
  warehouseCode?: string;

  @ApiPropertyOptional()
  warehouseName?: string;

  @ApiProperty()
  vehicleNumber: string;

  @ApiPropertyOptional()
  vehicleTypeId?: string;

  @ApiPropertyOptional()
  vehicleTypeName?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  tareWeightKg?: number;

  @ApiPropertyOptional()
  totalGrossKg?: number;

  @ApiPropertyOptional()
  totalNetKg?: number;

  @ApiProperty()
  allLinesPassed: boolean;

  @ApiProperty()
  pendingApprovalCount: number;

  @ApiProperty()
  isDpmShipment: boolean;

  @ApiPropertyOptional()
  cancelReasonCode?: string;

  @ApiPropertyOptional()
  closeReasonCode?: string;

  @ApiPropertyOptional()
  shippedAt?: Date;

  @ApiPropertyOptional()
  closedAt?: Date;

  @ApiProperty()
  externalId: string;

  @ApiProperty()
  correlationId: string;

  @ApiProperty()
  sourceApp: string;

  @ApiProperty()
  rowVersion: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  updatedBy?: string;

  @ApiProperty({ type: [ShipmentLineResponseDto] })
  lines: ShipmentLineResponseDto[];
}

export class ShipmentListItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  shipmentNumber?: string;

  @ApiPropertyOptional()
  soId?: string;

  @ApiProperty()
  sourceType: string;

  @ApiProperty()
  ownerCode: string;

  @ApiProperty()
  ownerName: string;

  @ApiProperty()
  warehouseCode: string;

  @ApiProperty()
  vehicleNumber: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  lineCount: number;

  @ApiPropertyOptional()
  totalExpectedQtyKg?: number;

  @ApiPropertyOptional()
  totalNetKg?: number;

  @ApiProperty()
  pendingApprovalCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  shippedAt?: Date;
}

export class PaginatedShipmentListDto {
  @ApiProperty({ type: [ShipmentListItemDto] })
  items: ShipmentListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}
