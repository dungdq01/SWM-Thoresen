import { PrismaClient, M8DeviceStatus, M8ChannelStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedIntegrationPlatform() {
  console.log('🔌 Seeding Module 8: Integration Platform...');

  // Seed Weighbridge Devices
  const devices = [
    {
      deviceCode: 'WB-01',
      deviceName: 'Weighbridge Station 1 - Main Gate',
      warehouseId: null, // Will be linked if warehouse exists
      portName: 'COM3',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'NONE',
      frameFormat: 'STX,GS,WEIGHT,ETX',
      heartbeatIntervalSec: 300,
      stableWindowMs: 1000,
      isActive: true,
      lastStatus: M8DeviceStatus.ONLINE,
      lastSeenAt: new Date(),
    },
    {
      deviceCode: 'WB-02',
      deviceName: 'Weighbridge Station 2 - Warehouse A',
      warehouseId: null,
      portName: 'COM4',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'NONE',
      frameFormat: 'STX,GS,WEIGHT,ETX',
      heartbeatIntervalSec: 300,
      stableWindowMs: 1000,
      isActive: true,
      lastStatus: M8DeviceStatus.ONLINE,
      lastSeenAt: new Date(),
    },
    {
      deviceCode: 'WB-03',
      deviceName: 'Weighbridge Station 3 - Outbound',
      warehouseId: null,
      portName: 'COM5',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'NONE',
      frameFormat: 'STX,GS,WEIGHT,ETX',
      heartbeatIntervalSec: 300,
      stableWindowMs: 1000,
      isActive: true,
      lastStatus: M8DeviceStatus.OFFLINE,
      lastSeenAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
  ];

  for (const device of devices) {
    await prisma.m8WeighbridgeDevice.upsert({
      where: { deviceCode: device.deviceCode },
      update: device,
      create: device,
    });
  }
  console.log(`  ✓ Created ${devices.length} weighbridge devices`);

  // Seed Channel Health Snapshots
  const channels = [
    {
      channelName: 'WEIGHBRIDGE',
      status: M8ChannelStatus.HEALTHY,
      openAlertCount: 1,
      backlogCount: 0,
      successRate1h: 99.5,
      avgLatencyMs1h: 150,
    },
    {
      channelName: 'OCR',
      status: M8ChannelStatus.HEALTHY,
      openAlertCount: 0,
      backlogCount: 2,
      successRate1h: 95.0,
      avgLatencyMs1h: 2500,
    },
    {
      channelName: 'MOBILE_SYNC',
      status: M8ChannelStatus.HEALTHY,
      openAlertCount: 0,
      backlogCount: 0,
      successRate1h: 100.0,
      avgLatencyMs1h: 80,
    },
    {
      channelName: 'ERP_PUSH',
      status: M8ChannelStatus.DEGRADED,
      openAlertCount: 2,
      backlogCount: 5,
      successRate1h: 85.0,
      avgLatencyMs1h: 3000,
    },
  ];

  for (const channel of channels) {
    await prisma.m8ChannelHealthSnapshot.upsert({
      where: { channelName: channel.channelName },
      update: channel,
      create: channel,
    });
  }
  console.log(`  ✓ Created ${channels.length} channel health snapshots`);

  console.log('✅ Module 8: Integration Platform seeding completed');
}

// Run if executed directly
if (require.main === module) {
  seedIntegrationPlatform()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
