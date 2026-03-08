/**
 * Module 7: Work Execution - Validate Scan Use Case
 */

const { WorkNotFoundError, WorkLineNotFoundError, InvalidScannedLocationError, LocationTypeNotAllowedError } = require('../domain/work.errors');
const { LOCATION_TYPE_FOR_WORK } = require('../domain/work.types');

class ValidateScanUseCase {
  constructor(workHeaderRepo, locationRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.locationRepo = locationRepo;
  }

  async execute(input) {
    const { workId, lineNum, scannedLocationCode } = input;

    const header = await this.workHeaderRepo.findByWorkId(workId);
    if (!header) {
      throw new WorkNotFoundError(workId);
    }

    const line = header.lines?.find(l => l.lineNum === lineNum);
    if (!line) {
      throw new WorkLineNotFoundError(workId, lineNum);
    }

    if (!this.locationRepo) {
      return {
        valid: true,
        locationCode: scannedLocationCode,
        locationId: null,
        message: 'Location validation skipped (no repository)',
      };
    }

    const location = await this.locationRepo.findByCode(header.warehouseId, scannedLocationCode);
    if (!location) {
      throw new InvalidScannedLocationError(scannedLocationCode, 'Location not found');
    }

    if (!location.isActive) {
      throw new InvalidScannedLocationError(scannedLocationCode, 'Location is inactive');
    }

    if (location.status === 'BLOCKED') {
      throw new InvalidScannedLocationError(scannedLocationCode, 'Location is blocked');
    }

    if (location.warehouseId !== header.warehouseId) {
      throw new InvalidScannedLocationError(scannedLocationCode, 'Location belongs to different warehouse');
    }

    const rules = LOCATION_TYPE_FOR_WORK[header.workType];
    if (rules && rules.to) {
      if (location.locationType !== rules.to) {
        throw new LocationTypeNotAllowedError(scannedLocationCode, location.locationType, [rules.to]);
      }
    }

    return {
      valid: true,
      locationCode: location.locationCode,
      locationId: location.id,
      locationType: location.locationType,
      zoneName: location.zone?.zoneName || null,
      message: 'Location is valid',
    };
  }
}

module.exports = { ValidateScanUseCase };
