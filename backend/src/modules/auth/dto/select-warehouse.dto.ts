import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class SelectWarehouseDto {
  @IsString()
  @IsNotEmpty({ message: 'Warehouse ID không được để trống' })
  @IsUUID('4', { message: 'Warehouse ID phải là UUID hợp lệ' })
  warehouseId!: string;
}
