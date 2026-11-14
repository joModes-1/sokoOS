import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogueService } from './catalogue.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@ApiTags('catalogue')
@ApiBearerAuth()
@Controller('catalogue')
export class CatalogueController {
  constructor(private catalogue: CatalogueService) {}

  // Categories
  @Get('categories') async listCategories(@CurrentUser() u: AuthUser) { return this.catalogue.listCategories(u.businessId!); }
  @Post('categories') @RequirePermissions('catalogue.manage') async createCategory(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.catalogue.createCategory(u.businessId!, u.id, body as never); }
  @Delete('categories/:id') @RequirePermissions('catalogue.manage') async deleteCategory(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.catalogue.deleteCategory(u.businessId!, id); }

  // Brands
  @Get('brands') async listBrands(@CurrentUser() u: AuthUser) { return this.catalogue.listBrands(u.businessId!); }
  @Post('brands') @RequirePermissions('catalogue.manage') async createBrand(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.catalogue.createBrand(u.businessId!, u.id, body as never); }

  // Products
  @Get('products')
  async listProducts(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) {
    return this.catalogue.listProducts(u.businessId!, {
      q: q['q'], categoryId: q['categoryId'], brandId: q['brandId'],
      active: q['active'] === 'true' ? true : q['active'] === 'false' ? false : undefined,
      page: parseInt(q['page'] ?? '1'), limit: parseInt(q['limit'] ?? '25'),
    });
  }

  @Post('products') @RequirePermissions('catalogue.manage')
  async createProduct(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.catalogue.createProduct(u.businessId!, u.id, body as never); }

  @Patch('products/:id') @RequirePermissions('catalogue.manage')
  async updateProduct(@Param('id') id: string, @Body() body: unknown, @CurrentUser() u: AuthUser) { return this.catalogue.updateProduct(u.businessId!, id, u.id, body as never); }

  @Post('products/:id/variants') @RequirePermissions('catalogue.manage')
  async createVariant(@Param('id') id: string, @Body() body: unknown, @CurrentUser() u: AuthUser) { return this.catalogue.createVariant(u.businessId!, id, body as never); }

  @Get('lookup/barcode/:barcode')
  async lookupBarcode(@Param('barcode') barcode: string, @CurrentUser() u: AuthUser) { return this.catalogue.lookupBarcode(u.businessId!, barcode); }
}
