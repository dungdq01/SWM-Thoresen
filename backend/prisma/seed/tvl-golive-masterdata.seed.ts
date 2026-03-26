import {
  PrismaClient,
  OwnerType,
  CarrierGroup,
  TransportMode,
  WarehouseType,
  ZoneType,
  LocationType,
  LocationStatus,
  CargoForm,
} from '@prisma/client';

/**
 * Seed dữ liệu Master Data chuẩn Go-live TVL
 * Nguồn: masterdata_TVL_golive1.xlsx
 *
 * Bao gồm:
 * - 81 Chủ hàng (Owners)
 * - 48 Nhà vận chuyển (Carriers)
 * - Kho BCC5, TVL01, TVL02 (Warehouses)
 * - 10 Khu vực BCC5 + zones TVL01/TVL02 (Zones)
 * - 42 Vị trí (Locations)
 * - 24 Mã hàng phân bón (Items)
 * - 4 Trạng thái tồn kho (Inventory Statuses)
 * - 8 Loại đơn nhập + 10 Loại đơn xuất (Dropdown configs)
 */
export async function seedTvlGoliveMasterData(prisma: PrismaClient) {
  const admin = await prisma.appUser.findUnique({ where: { userCode: 'admin' } });
  if (!admin) throw new Error('Admin user not found. Run main seed first.');
  const by = admin.id;

  console.log('🌱 Seeding TVL Go-live Master Data...');

  // ============================================================
  // 1. Owners — 81 Chủ hàng gửi kho
  // ============================================================
  const ownerSeeds = [
    { ownerCode: 'KH.001', ownerName: 'CÔNG TY CỔ PHẦN APROMACO MIỀN NAM', shortName: 'APR-MN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.002', ownerName: 'CÔNG TY CỔ PHẦN APROMACO MIỀN TRUNG', shortName: 'APR-MT', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.003', ownerName: 'CÔNG TY TNHH BACONCO', shortName: 'Baconco', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-NB01' },
    { ownerCode: 'KH.004', ownerName: 'CÔNG TY TNHH BEHN MEYER AGRICARE VIỆT NAM', shortName: 'BMA VN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.005', ownerName: 'CÔNG TY TNHH BRENNTAG VIỆT NAM', shortName: 'BRENT', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.006', ownerName: 'CÔNG TY CỔ PHẦN DỊCH VỤ XUẤT NHẬP KHẨU NÔNG LÂM SẢN VÀ PHÂN BÓN BÀ RỊA', shortName: 'BARIA Serece', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.007', ownerName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN CON CÒ VÀNG', shortName: 'CONCOVANG', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.008', ownerName: 'CHLOR-AL CHEMICAL PTE LTD', shortName: 'CHLOR-AL', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.009', ownerName: 'CHI NHÁNH CÔNG TY CỔ PHẦN TẬP ĐOÀN LONG HẢI TẠI THÀNH PHỐ HỒ CHÍ MINH', shortName: 'LONGHAI-CN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.010', ownerName: 'CÔNG TY CỔ PHẦN NHẬT VIỆT', shortName: 'JVF', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.011', ownerName: 'CÔNG TY TNHH TM DV MINH KHOA', shortName: 'MINHKHOA', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.012', ownerName: 'FOOD SECURITY SOLUTIONS DMCC', shortName: 'FSS-FZO (Ural)', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.013', ownerName: 'CÔNG TY TNHH KHOA HỌC KỸ THUẬT NÔNG NGHIỆP GEMINI', shortName: 'GEMINI', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.014', ownerName: 'GLOBAL CHEMICAL COMPANY GmbH', shortName: 'GLOBAL', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.015', ownerName: 'GOVITA INTERNATIONAL FZE', shortName: 'GOVITAL', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.016', ownerName: 'CÔNG TY TNHH XUẤT NHẬP KHẨU PHÂN BÓN GIA VŨ', shortName: 'GIAVU', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.017', ownerName: 'CÔNG TY CỔ PHẦN HÓA CHẤT HIẾM VIỆT NAM', shortName: 'VREC', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.018', ownerName: 'HORIZONTAL ALLIANCE LIMITED', shortName: 'HORIZONTAL', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.019', ownerName: 'CÔNG TY TNHH SẢN XUẤT PHÂN BÓN HỮU THÀNH', shortName: 'HUUTHANH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.020', ownerName: 'CÔNG TY CỔ PHẦN TỔNG CÔNG TY KC HÀ TĨNH', shortName: 'KC HATINH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.021', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI KOBELCO VIỆT NAM', shortName: 'KOBELCO', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.022', ownerName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN LÊ PHẠM', shortName: 'LEPHAM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.023', ownerName: 'CÔNG TY TNHH LÂM PHÚ GIA', shortName: 'LAMPHUGIA', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.024', ownerName: "SAUDI ARABIAN MINING COMPANY (MA'ADEN)", shortName: 'MAADEN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.025', ownerName: 'CÔNG TY CỔ PHẦN MTK HỮU THÀNH', shortName: 'MTK HUUTHANH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.026', ownerName: 'CÔNG TY TNHH TMDV NIC CHEMICAL', shortName: 'NIC CHEMICAL', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.027', ownerName: 'CÔNG TY CỔ PHẦN VẬT TƯ KỸ THUẬT NÔNG NGHIỆP BÌNH ĐỊNH', shortName: 'VTNNBD', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.028', ownerName: 'CÔNG TY CỔ PHẦN VẬT TƯ NÔNG NGHIỆP II ĐÀ NẴNG', shortName: 'VTNNDN-II', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.029', ownerName: 'CÔNG TY CỔ PHẦN VẬT TƯ NÔNG NGHIỆP ĐỒNG NAI', shortName: 'DOCAM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.030', ownerName: 'CÔNG TY TNHH VTNN HƯNG THẠNH', shortName: 'HUNGTHANH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.031', ownerName: 'CÔNG TY TNHH NÔNG NGHIỆP MẠNH NÔNG', shortName: 'MANHNONG', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.032', ownerName: 'CÔNG TY CỔ PHẦN NÔNG NGHIỆP TRƯỜNG HẢI', shortName: 'TRUONGHAI', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.033', ownerName: 'CÔNG TY TNHH NÔNG SẢN TRẦN QUANG', shortName: 'TRANQUANG', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.034', ownerName: 'CÔNG TY CỔ PHẦN THƯƠNG MẠI VẬN TẢI VÀ DỊCH VỤ OCEAN DRAGON', shortName: 'DRAGON', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.035', ownerName: 'PACIFIC RIM INTERNATIONAL FERTILIZER LIMITED', shortName: 'PACIFIC', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.036', ownerName: 'CÔNG TY TNHH PACTRA VIỆT NAM', shortName: 'PACTRA', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.037', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI PHÂN BÓN AN LÂM', shortName: 'ANLAM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.038', ownerName: 'CÔNG TY CỔ PHẦN PHÚ BÌNH GIA LAI', shortName: 'PHUBINH GIALAI', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.039', ownerName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN PHÂN BÓN GIA VŨ', shortName: 'GIAVU-2', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.040', ownerName: 'CÔNG TY CỔ PHẦN PHÂN BÓN HÀ LAN', shortName: 'HALAN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.041', ownerName: 'CÔNG TY TNHH PHÂN BÓN KIẾN KHOA', shortName: 'KIENKHOA', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.042', ownerName: 'CÔNG TY TNHH PHÂN BÓN KIẾN THÀNH', shortName: 'KIENTHANH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.043', ownerName: 'CÔNG TY CỔ PHẦN PHÂN BÓN MIỀN NAM', shortName: 'PBMIENNAM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.044', ownerName: 'CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU PHÂN BÓN MINH TÂN', shortName: 'PBMINHTAN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.045', ownerName: 'CÔNG TY TNHH PHÂN BÓN NGUYÊN NGỌC', shortName: 'PBNGNUYENNGOC', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.046', ownerName: 'CÔNG TY TNHH PHÂN BÓN PHẠM GIA', shortName: 'PB PHAMGIA', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.047', ownerName: 'CÔNG TY TNHH XUẤT NHẬP KHẨU PHÂN BÓN PHÚC THỊNH', shortName: 'PHUCTHINH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.048', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ XUẤT NHẬP KHẨU PHÂN BÓN THẾ MẪN', shortName: 'THEMAN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.049', ownerName: 'CÔNG TY TNHH PHÂN BÓN TÂN THÀNH AG', shortName: 'TANTHANH AG', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.050', ownerName: 'CÔNG TY TNHH VẬN TẢI PHÂN BÓN TUẤN VŨ', shortName: 'TUANVU', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.051', ownerName: 'CÔNG TY PHÂN BÓN VIỆT NHẬT', shortName: 'JVF-PB', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.052', ownerName: 'RICHFARM AGRI PTY LTD', shortName: 'RICHFARM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.053', ownerName: 'CÔNG TY TNHH ĐẦU TƯ SSG', shortName: 'SSG', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.054', ownerName: 'TỔNG CÔNG TY PHÂN BÓN VÀ HÓA CHẤT DẦU KHÍ - CÔNG TY CỔ PHẦN', shortName: 'PVFCCO-TCT', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.055', ownerName: 'CÔNG TY CỔ PHẦN PHÂN BÓN VÀ HÓA CHẤT DẦU KHÍ TÂY NAM BỘ', shortName: 'PVFC-TNB', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.056', ownerName: 'CÔNG TY CỔ PHẦN PHÂN BÓN VÀ HOÁ CHẤT DẦU KHÍ ĐÔNG NAM BỘ', shortName: 'PVFC-DNB', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.057', ownerName: 'CÔNG TY CỔ PHẦN PHÂN BÓN DẦU KHÍ CÀ MAU', shortName: 'PVFC-DCM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.058', ownerName: 'CHI NHÁNH TỔNG CÔNG TY PHÂN BÓN VÀ HÓA CHẤT DẦU KHÍ - CÔNG TY CỔ PHẦN - NHÀ MÁY ĐẠM PHÚ MỸ', shortName: 'PVFC-NMDPM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.059', ownerName: 'CÔNG TY CỔ PHẦN PHÂN BÓN VÀ HÓA CHẤT DẦU KHÍ MIỀN TRUNG', shortName: 'PVFC-MT', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.060', ownerName: 'TỔNG CÔNG TY PHÂN BÓN VÀ HÓA CHẤT DẦU KHÍ - CÔNG TY CỔ PHẦN - CHI NHÁNH KINH DOANH HÓA CHẤT DẦU KHÍ', shortName: 'PVFC-HCDK', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.061', ownerName: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN LONG HẢI', shortName: 'LONGHAI-TD', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.062', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI ÁNH VÂN', shortName: 'ANHVAN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.063', ownerName: 'CÔNG TY TNHH SẢN XUẤT - DỊCH VỤ VÀ THƯƠNG MẠI HUỲNH THÀNH', shortName: 'HUYNHTHANH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.064', ownerName: 'CÔNG TY TNHH HÓA CHẤT TMK - ĐẠI HÙNG', shortName: 'TMK-DAIHUNG', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.065', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI NGUYỄN KHOA', shortName: 'NGUYENKHOA', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.066', ownerName: 'CÔNG TY TNHH ĐT & TM TRƯỜNG PHÁT', shortName: 'TRUONGPHAT', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.067', ownerName: 'CHI NHÁNH CÔNG TY TNHH THƯƠNG MẠI TÂN THÀNH TẠI AN GIANG', shortName: 'TANTHANH AG-CN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.068', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI - DỊCH VỤ - XUẤT NHẬP KHẨU TƯỜNG NGUYÊN', shortName: 'TUONGNGUYEN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.069', ownerName: 'CÔNG TY TNHH SẢN XUẤT VÀ THƯƠNG MẠI THIÊN THÀNH LỘC', shortName: 'THIENTHANHLOC', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.070', ownerName: 'VALENCY INTERNATIONAL PTE LTD', shortName: 'VALENCY-SING', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.071', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI QUỐC TẾ VALENCY VIỆT NAM', shortName: 'VALENCY-VN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.072', ownerName: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN VINACAM', shortName: 'VINACAM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.073', ownerName: 'CÔNG TY CỔ PHẦN VINAFARM VIỆT NAM', shortName: 'VINAFARM', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.074', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI - DỊCH VỤ - VẬN TẢI HỒNG VÂN', shortName: 'HONGVAN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.075', ownerName: 'CÔNG TY CỔ PHẦN VẬT TƯ NÔNG SẢN', shortName: 'APROMACO', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.076', ownerName: 'CÔNG TY TNHH WILMAR MARKETING CLV', shortName: 'WILMAR-CLV', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.077', ownerName: 'CÔNG TY TNHH THƯƠNG MẠI XUẤT NHẬP KHẨU KHAI ANH', shortName: 'KHAIANH', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.078', ownerName: 'CÔNG TY TNHH XUẤT NHẬP KHẨU KẾT NÔNG', shortName: 'KETNONG', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.079', ownerName: 'CÔNG TY TNHH YARA VIỆT NAM', shortName: 'YARA-VN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.080', ownerName: 'CÔNG TY TNHH NGUYỄN PHAN', shortName: 'NGUYENPHAN', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
    { ownerCode: 'KH.081', ownerName: 'OCP NUTRICROPS SA', shortName: 'OCP', ownerType: OwnerType.DIRECT, ownerGroup: 'KH-CH01' },
  ];

  let ownerCount = 0;
  for (const o of ownerSeeds) {
    await prisma.mdOwner.upsert({
      where: { ownerCode: o.ownerCode },
      update: { ownerName: o.ownerName, shortName: o.shortName, ownerType: o.ownerType, ownerGroup: o.ownerGroup, updatedBy: by },
      create: { ownerCode: o.ownerCode, ownerName: o.ownerName, shortName: o.shortName, ownerType: o.ownerType, ownerGroup: o.ownerGroup, taxCode: '', address: '', createdBy: by, updatedBy: by },
    });
    ownerCount++;
  }
  console.log(`  ✅ TVL Owners: ${ownerCount} records`);

  // ============================================================
  // 2. Carriers — 48 Nhà vận chuyển
  // ============================================================
  const carrierSeeds = [
    { carrierCode: 'NCC01', carrierName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN VẬN TẢI CHANG HO' },
    { carrierCode: 'NCC02', carrierName: 'CÔNG TY TNHH ĐẦU TƯ THƯƠNG MẠI DANACO' },
    { carrierCode: 'NCC03', carrierName: 'CÔNG TY CỔ PHẦN ĐÔNG DƯƠNG LOGISTICS' },
    { carrierCode: 'NCC04', carrierName: 'CÔNG TY TNHH ĐẠI LÝ VÀ TIẾP VẬN HẢI AN' },
    { carrierCode: 'NCC05', carrierName: 'CÔNG TY TNHH ĐINH NGUYỄN' },
    { carrierCode: 'NCC06', carrierName: 'CÔNG TY CỔ PHẦN QUỐC TẾ GA MA' },
    { carrierCode: 'NCC07', carrierName: 'CÔNG TY TNHH VẬN TẢI CONTAINER HẢI AN' },
    { carrierCode: 'NCC08', carrierName: 'CÔNG TY TNHH DỊCH VỤ HÀNG HẢI LOAN ANH' },
    { carrierCode: 'NCC09', carrierName: 'CÔNG TY TNHH HỒNG HÀ - PHÚ MỸ' },
    { carrierCode: 'NCC10', carrierName: 'CÔNG TY TNHH XUẤT NHẬP KHẨU HIỆP LOAN' },
    { carrierCode: 'NCC11', carrierName: 'CÔNG TY TNHH HS LOGISTICS' },
    { carrierCode: 'NCC12', carrierName: 'CÔNG TY TNHH VẬN TẢI BIỂN KHẢI MINH' },
    { carrierCode: 'NCC13', carrierName: 'CÔNG TY TNHH VẬN TẢI KHANG NHƯ Ý' },
    { carrierCode: 'NCC14', carrierName: 'CÔNG TY TNHH VẬN TẢI LÊ BÁ' },
    { carrierCode: 'NCC15', carrierName: 'CÔNG TY CỔ PHẦN LOGISTICS ĐÔNG Á' },
    { carrierCode: 'NCC16', carrierName: 'CÔNG TY TNHH MINH THÀNH PHÁT VINA' },
    { carrierCode: 'NCC17', carrierName: 'CÔNG TY TNHH ĐẦU TƯ PHÁT TRIỂN MAI THUẬN VINH' },
    { carrierCode: 'NCC18', carrierName: 'CÔNG TY CỔ PHẦN LOGISTICS NEW WAY' },
    { carrierCode: 'NCC19', carrierName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN Ô TÔ NGỌC PHƯƠNG' },
    { carrierCode: 'NCC20', carrierName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN TIẾP VẬN QUỐC TẾ CÁI MÉP' },
    { carrierCode: 'NCC21', carrierName: 'CÔNG TY CỔ PHẦN SHT LOGISTICS' },
    { carrierCode: 'NCC22', carrierName: 'CHI NHÁNH CÔNG TY TNHH XẾP DỠ HÀNG HÓA THIÊN ẤN' },
    { carrierCode: 'NCC23', carrierName: 'CÔNG TY TNHH XẾP DỠ HÀNG HÓA THIÊN ẤN' },
    { carrierCode: 'NCC24', carrierName: 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ THANH ANH LOGISTICS' },
    { carrierCode: 'NCC25', carrierName: 'CÔNG TY TNHH TM DV VẬN TẢI Ô TÔ TÂN CHÂU' },
    { carrierCode: 'NCC26', carrierName: 'CÔNG TY CỔ PHẦN TOÀN CẦU AN KHANG' },
    { carrierCode: 'NCC27', carrierName: 'CÔNG TY TNHH CẢNG QUỐC TẾ TÂN CẢNG - CÁI MÉP' },
    { carrierCode: 'NCC28', carrierName: 'CÔNG TY CỔ PHẦN VẬN TẢI THUẬN PHÁT' },
    { carrierCode: 'NCC29', carrierName: 'CÔNG TY CỔ PHẦN VẬN TẢI XUẤT NHẬP KHẨU TÍN PHÁT' },
    { carrierCode: 'NCC30', carrierName: 'CÔNG TY CỔ PHẦN VẬN TẢI 1 TRACO' },
    { carrierCode: 'NCC31', carrierName: 'CÔNG TY TNHH TT LOGISTICS' },
    { carrierCode: 'NCC32', carrierName: 'CÔNG TY CỔ PHẦN LOGISTICS TÂN THUẬN PHONG' },
    { carrierCode: 'NCC33', carrierName: 'CÔNG TY TNHH TM DV TÂN TRÍ PHÁT' },
    { carrierCode: 'NCC34', carrierName: 'CÔNG TY TNHH TM-XNK THIÊN THIÊN THANH' },
    { carrierCode: 'NCC35', carrierName: 'CÔNG TY CỔ PHẦN DỊCH VỤ THƯƠNG MẠI VÀ LOGISTICS TIẾN ĐẠT' },
    { carrierCode: 'NCC36', carrierName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN VẬN CHUYỂN SỸ NGUYÊN' },
    { carrierCode: 'NCC37', carrierName: 'CÔNG TY CỔ PHẦN LOGISTICS VINACORP' },
    { carrierCode: 'NCC38', carrierName: 'CÔNG TY CỔ PHẦN VẬN TẢI CÁI MÉP' },
    { carrierCode: 'NCC39', carrierName: 'CÔNG TY TNHH THƯƠNG MẠI - DỊCH VỤ VẬN TẢI NHẬT BẢO' },
    { carrierCode: 'NCC40', carrierName: 'CÔNG TY TNHH XUẤT NHẬP KHẨU DỊCH VỤ VẬN TẢI NGUYÊN LONG VƯƠNG' },
    { carrierCode: 'NCC41', carrierName: 'CÔNG TY TNHH VẬN TẢI NHANH VIỆT NAM' },
    { carrierCode: 'NCC42', carrierName: 'CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHAN HOÀNG MINH' },
    { carrierCode: 'NCC43', carrierName: 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI THÀNH LAN' },
    { carrierCode: 'NCC44', carrierName: 'CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI TRỌNG TÝ' },
    { carrierCode: 'NCC45', carrierName: 'CHI NHÁNH TẠI TỈNH BÀ RỊA - VŨNG TÀU CÔNG TY CỔ PHẦN VẬN TẢI VÀ XẾP DỠ HẢI AN' },
    { carrierCode: 'NCC46', carrierName: 'CÔNG TY TNHH TM XNK NGỌC THANH' },
    { carrierCode: 'NCC47', carrierName: 'CÔNG TY TRÁCH NHIỆM HỮU HẠN YẾN PHÚC THỊNH' },
    { carrierCode: 'NCC48', carrierName: 'CÔNG TY TNHH TM DV Ý THÀNH DUY' },
  ];

  let carrierCount = 0;
  for (const c of carrierSeeds) {
    await prisma.mdCarrier.upsert({
      where: { carrierCode: c.carrierCode },
      update: { carrierName: c.carrierName, updatedBy: by },
      create: { carrierCode: c.carrierCode, carrierName: c.carrierName, carrierGroup: CarrierGroup.TRUCKING, transportMode: TransportMode.TRUCK, createdBy: by, updatedBy: by },
    });
    carrierCount++;
  }
  console.log(`  ✅ TVL Carriers: ${carrierCount} records`);

  // ============================================================
  // 3. Warehouses — BCC5, TVL01, TVL02
  // ============================================================
  const warehouseSeeds = [
    { warehouseCode: 'BCC5', warehouseName: 'Kho BCC5 — Bãi chứa cảng 5', warehouseType: WarehouseType.COVERED, totalAreaM2: 30000, usableAreaM2: 27000, maxHeightM: 12, maxCapacityMt: 80000 },
    { warehouseCode: 'TVL01', warehouseName: 'Kho TVL01 — Kho chính TVL', warehouseType: WarehouseType.COVERED, totalAreaM2: 20000, usableAreaM2: 18000, maxHeightM: 12, maxCapacityMt: 60000 },
    { warehouseCode: 'TVL02', warehouseName: 'Kho TVL02 — Kho phụ TVL', warehouseType: WarehouseType.COVERED, totalAreaM2: 15000, usableAreaM2: 13000, maxHeightM: 12, maxCapacityMt: 45000 },
  ];

  const whMap: Record<string, string> = {};
  for (const wh of warehouseSeeds) {
    const created = await prisma.mdWarehouse.upsert({
      where: { warehouseCode: wh.warehouseCode },
      update: { warehouseName: wh.warehouseName, warehouseType: wh.warehouseType, totalAreaM2: wh.totalAreaM2, usableAreaM2: wh.usableAreaM2, maxHeightM: wh.maxHeightM, maxCapacityMt: wh.maxCapacityMt, updatedBy: by },
      create: { ...wh, siteId: 'TVL-SITE', address: 'Cảng TVL, Phú Mỹ, Bà Rịa - Vũng Tàu', hasWeighbridge: true, weighbridgeCount: 2, isBonded: false, capacityWarningPct: 85, createdBy: by, updatedBy: by },
    });
    whMap[wh.warehouseCode] = created.id;
  }
  console.log(`  ✅ TVL Warehouses: ${Object.keys(whMap).length} records`);

  // ============================================================
  // 4. Zones — Khu vực trong kho
  // ============================================================
  const zoneSeeds = [
    // BCC5 zones (từ Excel)
    { zoneCode: '5.1.1', zoneName: 'Khu 5.1.1', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.2.1', zoneName: 'Khu 5.2.1', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.3.1', zoneName: 'Khu 5.3.1', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.4.1', zoneName: 'Khu 5.4.1', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.4.2', zoneName: 'Khu 5.4.2', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.5.1', zoneName: 'Khu 5.5.1', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.5.2', zoneName: 'Khu 5.5.2', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.5.3', zoneName: 'Khu 5.5.3', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.6.1', zoneName: 'Khu 5.6.1', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    { zoneCode: '5.6.2', zoneName: 'Khu 5.6.2', wh: 'BCC5', zoneType: ZoneType.STORAGE },
    // TVL01 zones (derive from location codes)
    { zoneCode: 'TVL1.1', zoneName: 'Khu TVL1.1', wh: 'TVL01', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL1.2', zoneName: 'Khu TVL1.2', wh: 'TVL01', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL1.3', zoneName: 'Khu TVL1.3', wh: 'TVL01', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL1.4', zoneName: 'Khu TVL1.4', wh: 'TVL01', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL1.5', zoneName: 'Khu TVL1.5', wh: 'TVL01', zoneType: ZoneType.STORAGE },
    // TVL02 zones
    { zoneCode: 'TVL2.1', zoneName: 'Khu TVL2.1', wh: 'TVL02', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL2.2', zoneName: 'Khu TVL2.2', wh: 'TVL02', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL2.3', zoneName: 'Khu TVL2.3', wh: 'TVL02', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL2.4', zoneName: 'Khu TVL2.4', wh: 'TVL02', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL2.5', zoneName: 'Khu TVL2.5', wh: 'TVL02', zoneType: ZoneType.STORAGE },
    { zoneCode: 'TVL2.6', zoneName: 'Khu TVL2.6', wh: 'TVL02', zoneType: ZoneType.STORAGE },
  ];

  const zoneMap: Record<string, string> = {};
  for (const z of zoneSeeds) {
    const warehouseId = whMap[z.wh];
    if (!warehouseId) continue;
    const created = await prisma.mdZone.upsert({
      where: { warehouseId_zoneCode: { warehouseId, zoneCode: z.zoneCode } },
      update: { zoneName: z.zoneName, zoneType: z.zoneType, updatedBy: by },
      create: { warehouseId, zoneCode: z.zoneCode, zoneName: z.zoneName, zoneType: z.zoneType, isBillingZone: true, createdBy: by, updatedBy: by },
    });
    zoneMap[z.zoneCode] = created.id;
  }
  console.log(`  ✅ TVL Zones: ${Object.keys(zoneMap).length} records`);

  // ============================================================
  // 5. Locations — 42 Vị trí lưu trữ
  // ============================================================
  const locationSeeds = [
    // BCC5 locations (zone = first 5 chars of locationCode)
    { locationCode: '5.1.1-1', wh: 'BCC5', zone: '5.1.1' },
    { locationCode: '5.1.1-2', wh: 'BCC5', zone: '5.1.1' },
    { locationCode: '5.1.1-3', wh: 'BCC5', zone: '5.1.1' },
    { locationCode: '5.1.1-4', wh: 'BCC5', zone: '5.1.1' },
    { locationCode: '5.1.1-5', wh: 'BCC5', zone: '5.1.1' },
    { locationCode: '5.2.1-1', wh: 'BCC5', zone: '5.2.1' },
    { locationCode: '5.2.1-2', wh: 'BCC5', zone: '5.2.1' },
    { locationCode: '5.2.1-3', wh: 'BCC5', zone: '5.2.1' },
    { locationCode: '5.3.1-1', wh: 'BCC5', zone: '5.3.1' },
    { locationCode: '5.3.1-2', wh: 'BCC5', zone: '5.3.1' },
    { locationCode: '5.3.1-3', wh: 'BCC5', zone: '5.3.1' },
    { locationCode: '5.4.1-1', wh: 'BCC5', zone: '5.4.1' },
    { locationCode: '5.4.1-2', wh: 'BCC5', zone: '5.4.1' },
    { locationCode: '5.4.1-3', wh: 'BCC5', zone: '5.4.1' },
    { locationCode: '5.4.2-1', wh: 'BCC5', zone: '5.4.2' },
    { locationCode: '5.4.2-2', wh: 'BCC5', zone: '5.4.2' },
    { locationCode: '5.4.2-3', wh: 'BCC5', zone: '5.4.2' },
    { locationCode: '5.5.1-1', wh: 'BCC5', zone: '5.5.1' },
    { locationCode: '5.5.2-1', wh: 'BCC5', zone: '5.5.2' },
    { locationCode: '5.5.2-2', wh: 'BCC5', zone: '5.5.2' },
    { locationCode: '5.5.2-3', wh: 'BCC5', zone: '5.5.2' },
    { locationCode: '5.5.3-1', wh: 'BCC5', zone: '5.5.3' },
    { locationCode: '5.5.3-2', wh: 'BCC5', zone: '5.5.3' },
    { locationCode: '5.5.3-3', wh: 'BCC5', zone: '5.5.3' },
    { locationCode: '5.5.3-4', wh: 'BCC5', zone: '5.5.3' },
    { locationCode: '5.6.1-1', wh: 'BCC5', zone: '5.6.1' },
    { locationCode: '5.6.1-2', wh: 'BCC5', zone: '5.6.1' },
    { locationCode: '5.6.1-3', wh: 'BCC5', zone: '5.6.1' },
    { locationCode: '5.6.2-1', wh: 'BCC5', zone: '5.6.2' },
    { locationCode: '5.6.2-2', wh: 'BCC5', zone: '5.6.2' },
    { locationCode: '5.6.2-3', wh: 'BCC5', zone: '5.6.2' },
    // TVL01 locations (zone = same as locationCode for TVL)
    { locationCode: 'TVL1.1', wh: 'TVL01', zone: 'TVL1.1' },
    { locationCode: 'TVL1.2', wh: 'TVL01', zone: 'TVL1.2' },
    { locationCode: 'TVL1.3', wh: 'TVL01', zone: 'TVL1.3' },
    { locationCode: 'TVL1.4', wh: 'TVL01', zone: 'TVL1.4' },
    { locationCode: 'TVL1.5', wh: 'TVL01', zone: 'TVL1.5' },
    // TVL02 locations
    { locationCode: 'TVL2.1', wh: 'TVL02', zone: 'TVL2.1' },
    { locationCode: 'TVL2.2', wh: 'TVL02', zone: 'TVL2.2' },
    { locationCode: 'TVL2.3', wh: 'TVL02', zone: 'TVL2.3' },
    { locationCode: 'TVL2.4', wh: 'TVL02', zone: 'TVL2.4' },
    { locationCode: 'TVL2.5', wh: 'TVL02', zone: 'TVL2.5' },
    { locationCode: 'TVL2.6', wh: 'TVL02', zone: 'TVL2.6' },
  ];

  let locCount = 0;
  for (const loc of locationSeeds) {
    const warehouseId = whMap[loc.wh];
    const zoneId = zoneMap[loc.zone];
    if (!warehouseId || !zoneId) continue;
    await prisma.mdLocation.upsert({
      where: { warehouseId_locationCode: { warehouseId, locationCode: loc.locationCode } },
      update: { updatedBy: by },
      create: {
        warehouseId,
        zoneId,
        locationCode: loc.locationCode,
        locationType: LocationType.STORAGE,
        locationProfile: 'STG-BULK',
        status: LocationStatus.OK,
        isMixedOwner: false,
        isMixedProduct: false,
        isBillingLocation: true,
        createdBy: by,
        updatedBy: by,
      },
    });
    locCount++;
  }
  console.log(`  ✅ TVL Locations: ${locCount} records`);

  // ============================================================
  // 6. Items — 24 Mã hàng phân bón
  // ============================================================
  // Lấy UOM KG đã seed sẵn
  const kgUom = await prisma.mdUom.findUnique({ where: { uomCode: 'KG' } });
  const kgUomId = kgUom?.id;

  // Lấy/tạo Item Group phân bón
  let fertGroup = await prisma.mdItemGroup.findUnique({ where: { itemGroupCode: 'GRP-FERT' } });
  if (!fertGroup) {
    fertGroup = await prisma.mdItemGroup.create({
      data: { itemGroupCode: 'GRP-FERT', itemGroupName: 'Phân bón', cargoForm: 'BULK', createdBy: by, updatedBy: by },
    });
  }
  const fertGroupId = fertGroup.id;

  const itemSeeds = [
    // KALI BOT
    { itemCode: 'KALIBOT-XA', itemName: 'Kali bột — Xá', cargoForm: CargoForm.BULK, skuGroup: 'XÁ', defaultBagWeightKg: null },
    { itemCode: 'KALIBOT-BAO5', itemName: 'Kali bột — Bao 50kg', cargoForm: CargoForm.BAGGED_50KG, skuGroup: 'BAO', defaultBagWeightKg: 50 },
    { itemCode: 'KALIBOT-BAO2.5', itemName: 'Kali bột — Bao 25kg', cargoForm: CargoForm.BAGGED_25KG, skuGroup: 'BAO', defaultBagWeightKg: 25 },
    { itemCode: 'KALIBOT-BAO10', itemName: 'Kali bột — Bao Jumbo 1000kg', cargoForm: CargoForm.JUMBO, skuGroup: 'BAO', defaultBagWeightKg: 1000 },
    // KALI HẠT
    { itemCode: 'KALIHAT-XA', itemName: 'Kali hạt — Xá', cargoForm: CargoForm.BULK, skuGroup: 'XÁ', defaultBagWeightKg: null },
    { itemCode: 'KALIHAT-BAO5', itemName: 'Kali hạt — Bao 50kg', cargoForm: CargoForm.BAGGED_50KG, skuGroup: 'BAO', defaultBagWeightKg: 50 },
    { itemCode: 'KALIHAT-BAO2.5', itemName: 'Kali hạt — Bao 25kg', cargoForm: CargoForm.BAGGED_25KG, skuGroup: 'BAO', defaultBagWeightKg: 25 },
    { itemCode: 'KALIHAT-BAO10', itemName: 'Kali hạt — Bao Jumbo 1000kg', cargoForm: CargoForm.JUMBO, skuGroup: 'BAO', defaultBagWeightKg: 1000 },
    // UREA
    { itemCode: 'UREA-XA', itemName: 'Urê — Xá', cargoForm: CargoForm.BULK, skuGroup: 'XÁ', defaultBagWeightKg: null },
    { itemCode: 'UREA-BAO5', itemName: 'Urê — Bao 50kg', cargoForm: CargoForm.BAGGED_50KG, skuGroup: 'BAO', defaultBagWeightKg: 50 },
    { itemCode: 'UREA-BAO2.5', itemName: 'Urê — Bao 25kg', cargoForm: CargoForm.BAGGED_25KG, skuGroup: 'BAO', defaultBagWeightKg: 25 },
    { itemCode: 'UREA-BAO10', itemName: 'Urê — Bao Jumbo 1000kg', cargoForm: CargoForm.JUMBO, skuGroup: 'BAO', defaultBagWeightKg: 1000 },
    // SA (Ammonium Sulphate)
    { itemCode: 'SA-XA', itemName: 'SA — Xá', cargoForm: CargoForm.BULK, skuGroup: 'XÁ', defaultBagWeightKg: null },
    { itemCode: 'SA-BAO5', itemName: 'SA — Bao 50kg', cargoForm: CargoForm.BAGGED_50KG, skuGroup: 'BAO', defaultBagWeightKg: 50 },
    { itemCode: 'SA-BAO2.5', itemName: 'SA — Bao 25kg', cargoForm: CargoForm.BAGGED_25KG, skuGroup: 'BAO', defaultBagWeightKg: 25 },
    { itemCode: 'SA-BAO10', itemName: 'SA — Bao Jumbo 1000kg', cargoForm: CargoForm.JUMBO, skuGroup: 'BAO', defaultBagWeightKg: 1000 },
    // DAP
    { itemCode: 'DAP-XA', itemName: 'DAP — Xá', cargoForm: CargoForm.BULK, skuGroup: 'XÁ', defaultBagWeightKg: null },
    { itemCode: 'DAP-BAO5', itemName: 'DAP — Bao 50kg', cargoForm: CargoForm.BAGGED_50KG, skuGroup: 'BAO', defaultBagWeightKg: 50 },
    { itemCode: 'DAP-BAO2.5', itemName: 'DAP — Bao 25kg', cargoForm: CargoForm.BAGGED_25KG, skuGroup: 'BAO', defaultBagWeightKg: 25 },
    { itemCode: 'DAP-BAO10', itemName: 'DAP — Bao Jumbo 1000kg', cargoForm: CargoForm.JUMBO, skuGroup: 'BAO', defaultBagWeightKg: 1000 },
    // TSP
    { itemCode: 'TSP-XA', itemName: 'TSP — Xá', cargoForm: CargoForm.BULK, skuGroup: 'XÁ', defaultBagWeightKg: null },
    { itemCode: 'TSP-BAO5', itemName: 'TSP — Bao 50kg', cargoForm: CargoForm.BAGGED_50KG, skuGroup: 'BAO', defaultBagWeightKg: 50 },
    { itemCode: 'TSP-BAO2.5', itemName: 'TSP — Bao 25kg', cargoForm: CargoForm.BAGGED_25KG, skuGroup: 'BAO', defaultBagWeightKg: 25 },
    { itemCode: 'TSP-BAO10', itemName: 'TSP — Bao Jumbo 1000kg', cargoForm: CargoForm.JUMBO, skuGroup: 'BAO', defaultBagWeightKg: 1000 },
  ];

  let itemCount = 0;
  for (const item of itemSeeds) {
    await prisma.mdItem.upsert({
      where: { itemCode: item.itemCode },
      update: { itemName: item.itemName, cargoForm: item.cargoForm, category: 'Phân bón', defaultBagWeightKg: item.defaultBagWeightKg, updatedBy: by },
      create: {
        itemCode: item.itemCode,
        itemName: item.itemName,
        cargoForm: item.cargoForm,
        category: 'Phân bón',
        itemGroupId: fertGroupId,
        baseUomId: kgUomId ?? '',
        billingUomId: kgUomId ?? '',
        isCatchWeight: true,
        isStorageBillable: true,
        isPackaging: false,
        defaultBagWeightKg: item.defaultBagWeightKg,
        rotateBy: 'FIFO',
        createdBy: by,
        updatedBy: by,
      },
    });
    itemCount++;
  }
  console.log(`  ✅ TVL Items: ${itemCount} records`);

  // ============================================================
  // 7. Inventory Statuses — 4 trạng thái tồn kho TVL
  // ============================================================
  const statusSeeds = [
    { statusCode: 'GOOD',      description: 'Hàng tốt',       displayOrder: 1, isAllocatable: true,  isSystemLocked: true },
    { statusCode: 'DIRTY',     description: 'Hàng lấm bẩn',   displayOrder: 2, isAllocatable: false, isSystemLocked: false },
    { statusCode: 'SWEEPINGS', description: 'Hàng hót vét',    displayOrder: 3, isAllocatable: false, isSystemLocked: false },
    { statusCode: 'SHORTAGE',  description: 'Hàng hao hụt',    displayOrder: 4, isAllocatable: false, isSystemLocked: false },
  ];

  for (const s of statusSeeds) {
    await prisma.mdInventoryStatus.upsert({
      where: { statusCode: s.statusCode },
      update: { description: s.description, displayOrder: s.displayOrder, isAllocatable: s.isAllocatable, updatedBy: by },
      create: { ...s, createdBy: by, updatedBy: by },
    });
  }
  console.log(`  ✅ TVL Inventory Statuses: ${statusSeeds.length} records`);

  // ============================================================
  // 8. Dropdown Configs — Loại đơn nhập/xuất
  // ============================================================
  const inboundTypes = [
    { code: 'NK01', description: 'Nhập hàng xá' },
    { code: 'NK02', description: 'Nhập hàng cont xá' },
    { code: 'NK03', description: 'Nhập hàng bao 50 xe thông thường' },
    { code: 'NK04', description: 'Nhập hàng bao 25 xe thông thường' },
    { code: 'NK05', description: 'Nhập hàng bao Jumbo xe thông thường' },
    { code: 'NK06', description: 'Nhập hàng cont bao 50' },
    { code: 'NK07', description: 'Nhập hàng cont bao 25' },
    { code: 'NK08', description: 'Nhập hàng cont bao Jumbo' },
  ];

  const outboundTypes = [
    { code: 'XK01', description: 'Xuất hàng xá' },
    { code: 'XK02', description: 'Xuất hàng bao 50 xe thông thường' },
    { code: 'XK03', description: 'Xuất hàng bao 25 xe thông thường' },
    { code: 'XK04', description: 'Xuất hàng bao Jumbo xe thông thường' },
    { code: 'XK05', description: 'Xuất hàng bao 50 xe cont 20' },
    { code: 'XK06', description: 'Xuất hàng bao 25 xe cont 20' },
    { code: 'XK07', description: 'Xuất hàng bao Jumbo xe cont 20' },
    { code: 'XK08', description: 'Xuất hàng bao 50 xe cont 40' },
    { code: 'XK09', description: 'Xuất hàng bao 25 xe cont 40' },
    { code: 'XK10', description: 'Xuất hàng bao Jumbo xe cont 40' },
  ];

  let ddCount = 0;
  for (let i = 0; i < inboundTypes.length; i++) {
    const t = inboundTypes[i];
    await prisma.dropdownConfig.upsert({
      where: { entity_fieldName_value: { entity: 'inbound', fieldName: 'orderType', value: t.code } },
      update: { label: t.description, sortOrder: i + 1, isActive: true },
      create: { entity: 'inbound', fieldName: 'orderType', value: t.code, label: t.description, sortOrder: i + 1, isDefault: i === 0 },
    });
    ddCount++;
  }

  for (let i = 0; i < outboundTypes.length; i++) {
    const t = outboundTypes[i];
    await prisma.dropdownConfig.upsert({
      where: { entity_fieldName_value: { entity: 'outbound', fieldName: 'orderType', value: t.code } },
      update: { label: t.description, sortOrder: i + 1, isActive: true },
      create: { entity: 'outbound', fieldName: 'orderType', value: t.code, label: t.description, sortOrder: i + 1, isDefault: i === 0 },
    });
    ddCount++;
  }
  console.log(`  ✅ TVL Dropdown Configs: ${ddCount} records`);

  console.log('✅ TVL Go-live Master Data seeded successfully!');
}
