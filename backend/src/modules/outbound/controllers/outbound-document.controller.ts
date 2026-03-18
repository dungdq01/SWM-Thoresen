import { Controller, Get, Query } from '@nestjs/common';
import { OutboundDocumentService, OutboundDocumentQueryParams } from '../services/outbound-document.service';

@Controller('outbound/documents')
export class OutboundDocumentController {
  constructor(private readonly documentService: OutboundDocumentService) {}

  @Get()
  async findAll(@Query() query: OutboundDocumentQueryParams) {
    return this.documentService.findAll(query);
  }
}
