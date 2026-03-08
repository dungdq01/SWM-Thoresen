import { Controller, Get, Post, Param, Query, Body, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from '../services/export.service';
import { CreateExportJobDto, ExportJobQueryDto } from '../dto';

@Controller('api/v1/reporting/exports')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  async createExportJob(@Body() dto: CreateExportJobDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    const userRole = req.user?.role || 'ADMIN';
    return this.exportService.createExportJob(dto, userId, userRole);
  }

  @Get(':id')
  async getJobStatus(@Param('id') exportJobId: string) {
    return this.exportService.getJobStatus(exportJobId);
  }

  @Get(':id/download')
  async downloadExport(@Param('id') exportJobId: string, @Request() req: any, @Res() res: Response) {
    const userId = req.user?.id || 'system';
    const downloadInfo = await this.exportService.downloadExport(exportJobId, userId);
    
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
    res.setHeader('Content-Type', downloadInfo.contentType);
    
    return res.redirect(downloadInfo.downloadUrl);
  }

  @Get()
  async getUserExports(@Query() query: ExportJobQueryDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.exportService.getUserExports(userId, query);
  }
}
