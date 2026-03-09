import { Controller, Get, Post, Param, Query, Body, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExportService } from '../services/export.service';
import { CreateExportJobDto, ExportJobQueryDto } from '../dto';
import { AuthGuard, PermissionGuard, Permission, CurrentUser } from '../../foundation/auth';
import { RequestUser } from '../../../common/interfaces/request-user.interface';
import { REPORTING_CONSTANTS } from '../domain/reporting.constants';

@ApiTags('Reporting - Export')
@Controller('api/v1/reporting/exports')
@UseGuards(AuthGuard, PermissionGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.EXPORT_CREATE)
  @ApiOperation({ summary: 'Tạo export job' })
  @ApiResponse({ status: 201, description: 'Export job created' })
  async createExportJob(@Body() dto: CreateExportJobDto, @CurrentUser() user: RequestUser) {
    return this.exportService.createExportJob(dto, user.id, user.roleCodes[0] || 'VIEWER');
  }

  @Get(':id')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.EXPORT_READ)
  @ApiOperation({ summary: 'Lấy trạng thái export job' })
  @ApiResponse({ status: 200, description: 'Export job status' })
  async getJobStatus(@Param('id') exportJobId: string) {
    return this.exportService.getJobStatus(exportJobId);
  }

  @Get(':id/download')
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.EXPORT_READ)
  @ApiOperation({ summary: 'Download file export' })
  @ApiResponse({ status: 200, description: 'File download redirect' })
  async downloadExport(@Param('id') exportJobId: string, @CurrentUser() user: RequestUser, @Res() res: Response) {
    const downloadInfo = await this.exportService.downloadExport(exportJobId, user.id);
    
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
    res.setHeader('Content-Type', downloadInfo.contentType);
    
    return res.redirect(downloadInfo.downloadUrl);
  }

  @Get()
  @Permission(REPORTING_CONSTANTS.PERMISSION_CODES.EXPORT_READ)
  @ApiOperation({ summary: 'Lấy danh sách export của user' })
  @ApiResponse({ status: 200, description: 'User exports list' })
  async getUserExports(@Query() query: ExportJobQueryDto, @CurrentUser() user: RequestUser) {
    return this.exportService.getUserExports(user.id, query);
  }
}
