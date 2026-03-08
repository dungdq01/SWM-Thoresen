import { Injectable, Logger } from '@nestjs/common';
import { WeighbridgeDeviceRepository } from '../repositories/weighbridge-device.repository';
import { DeviceHeartbeatRepository } from '../repositories/device-heartbeat.repository';
import { DeviceStatus, AlertCode } from '../domain/integration.enums';
import { WeighbridgeError, IntegrationErrorCodes } from '../domain/integration.errors';
import { AlertService } from './alert.service';

@Injectable()
export class WeighbridgeDeviceService {
  private readonly logger = new Logger(WeighbridgeDeviceService.name);

  constructor(
    private readonly deviceRepo: WeighbridgeDeviceRepository,
    private readonly heartbeatRepo: DeviceHeartbeatRepository,
    private readonly alertService: AlertService,
  ) {}

  async getDevices(params: { warehouseId?: string; isActive?: boolean; page?: number; limit?: number }) {
    const skip = ((params.page || 1) - 1) * (params.limit || 50);
    return this.deviceRepo.findAll({
      warehouseId: params.warehouseId,
      isActive: params.isActive,
      skip,
      take: params.limit || 50,
    });
  }

  async getDeviceByCode(deviceCode: string) {
    const device = await this.deviceRepo.findByCode(deviceCode);
    if (!device) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.DEVICE_NOT_FOUND,
        `Device with code ${deviceCode} not found`,
      );
    }
    return device;
  }

  async validateDeviceActive(deviceCode: string) {
    const device = await this.deviceRepo.findByCode(deviceCode);
    if (!device) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.DEVICE_NOT_FOUND,
        `Device with code ${deviceCode} not found`,
      );
    }
    if (!device.isActive) {
      throw new WeighbridgeError(
        IntegrationErrorCodes.DEVICE_INACTIVE,
        `Device ${deviceCode} is not active`,
      );
    }
    return device;
  }

  async processHeartbeat(data: {
    deviceCode: string;
    agentVersion?: string;
    portName?: string;
    lastWeightReadAt?: Date;
    bufferPendingCount?: number;
    healthStatus?: string;
  }) {
    const device = await this.deviceRepo.findByCode(data.deviceCode);
    if (!device) {
      this.logger.warn(`Heartbeat received from unknown device: ${data.deviceCode}`);
      return { success: false, message: 'Unknown device' };
    }

    // Record heartbeat
    await this.heartbeatRepo.create({
      deviceCode: data.deviceCode,
      agentVersion: data.agentVersion,
      portName: data.portName,
      lastWeightReadAt: data.lastWeightReadAt,
      bufferPendingCount: data.bufferPendingCount || 0,
      healthStatus: data.healthStatus,
    });

    // Update device status
    const newStatus = this.determineDeviceStatus(data.healthStatus, data.bufferPendingCount);
    await this.deviceRepo.updateLastSeen(data.deviceCode, new Date(), newStatus);

    // If device was offline and now online, resolve alert
    if (device.lastStatus === DeviceStatus.OFFLINE && newStatus === DeviceStatus.ONLINE) {
      this.logger.log(`Device ${data.deviceCode} is back online`);
    }

    return { success: true, deviceCode: data.deviceCode, status: newStatus };
  }

  private determineDeviceStatus(healthStatus?: string, bufferPendingCount?: number): string {
    if (healthStatus === 'ERROR') return DeviceStatus.DEGRADED;
    if (bufferPendingCount && bufferPendingCount > 10) return DeviceStatus.DEGRADED;
    return DeviceStatus.ONLINE;
  }

  async checkOfflineDevices() {
    const offlineDevices = await this.deviceRepo.findOfflineDevices(10); // 10 minutes timeout
    
    for (const device of offlineDevices) {
      this.logger.warn(`Device ${device.deviceCode} is offline`);
      
      // Create alert for offline device
      await this.alertService.raiseAlert({
        alertCode: AlertCode.DEVICE_OFFLINE,
        alertSource: 'WEIGHBRIDGE',
        severity: 'ERROR',
        sourceRefType: 'DEVICE',
        sourceRefId: device.deviceCode,
        title: `Weighbridge device ${device.deviceCode} is offline`,
        description: `Device ${device.deviceName} has not sent heartbeat for over 10 minutes`,
        warehouseId: device.warehouseId || undefined,
      });

      // Update device status
      await this.deviceRepo.updateLastSeen(device.deviceCode, device.lastSeenAt || new Date(), DeviceStatus.OFFLINE);
    }

    return { offlineCount: offlineDevices.length, devices: offlineDevices.map(d => d.deviceCode) };
  }

  async getActiveDevices() {
    return this.deviceRepo.findActiveDevices();
  }
}
