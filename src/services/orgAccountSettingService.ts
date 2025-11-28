import { Prisma, type OrgAccountSetting } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import {
  TradeUnleashedOrgAccountSettingService,
  TradeUnleashedOrgAccountSetting,
} from '../integrations/tradeunleashed/index.js';

interface SyncResponse {
  success: boolean;
  count: number;
  data: OrgAccountSetting[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class OrgAccountSettingService {
  private integrationService: TradeUnleashedOrgAccountSettingService;

  constructor() {
    this.integrationService = new TradeUnleashedOrgAccountSettingService(config.tradeUnleashed);
  }

  async isEmpty(): Promise<boolean> {
    const count = await prisma.orgAccountSetting.count();
    return count === 0;
  }

  private async fetchSettings(params?: { max?: number; limit?: number }) {
    return this.integrationService.fetchSettings({
      max: params?.max ?? 50,
      limit: params?.limit ?? 50,
    });
  }

  private async persistSettings(settings: TradeUnleashedOrgAccountSetting[]): Promise<SyncResponse> {
    if (!settings || settings.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const upserts: OrgAccountSetting[] = [];
    for (const setting of settings) {
      const mapped = this.mapToPrisma(setting);
      const record = await prisma.orgAccountSetting.upsert({
        where: { id: mapped.id },
        update: mapped,
        create: mapped,
      });
      upserts.push(record);
    }

    return {
      success: true,
      count: upserts.length,
      data: upserts,
      source: 'tradeunleashed',
      syncedAt: new Date(),
    };
  }

  async syncFromTradeUnleashed(params?: {
    max?: number;
    limit?: number;
  }): Promise<SyncResponse> {
    const settings = await this.fetchSettings(params);
    return this.persistSettings(settings);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }) {
    const settings = await this.fetchSettings(params);
    const existingIds = new Set(
      (await prisma.orgAccountSetting.findMany({
        select: { id: true },
      })).map((record) => record.id)
    );

    const shouldSync =
      existingIds.size === 0 ||
      settings.some((setting) => !existingIds.has(Number(setting.id)));

    if (!shouldSync) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
        skipped: true as const,
      };
    }

    return this.persistSettings(settings);
  }

  async list() {
    return prisma.orgAccountSetting.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getLatest() {
    return prisma.orgAccountSetting.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  private mapToPrisma(
    setting: TradeUnleashedOrgAccountSetting
  ): Omit<Prisma.OrgAccountSettingUncheckedCreateInput, 'createdAt' | 'updatedAt'> {
    return {
      id: Number(setting.id),
      settings: setting as Prisma.InputJsonValue,
      enableSerializedInventory: setting.enableSerializedInventory ?? null,
      enableGroupedProducts: setting.enableGroupedProducts ?? null,
      scanBundleItems: setting.scanBundleItems ?? null,
      generateBarcodeByName: setting.generateBarcodeByName ?? null,
      generateBarcodeBySeries: setting.generateBarcodeBySeries ?? null,
      generateSkuByName: setting.generateSkuByName ?? null,
      generateSkuBySeries: setting.generateSkuBySeries ?? null,
      barcodePrefix: setting.barcodePrefix ?? null,
      skuPrefix: setting.skuPrefix ?? null,
      startingSeqNum: setting.startingSeqNum ?? null,
      attrCharLength: setting.attrCharLength ?? null,
      keepSellingOnOutOfStock: setting.keepSellingOnOutOfStock ?? null,
      continueTransferOnOutOfStock: setting.continueTransferOnOutOfStock ?? null,
      printSkuOnDocuments: setting.printSkuOnDocuments ?? null,
      printBarcodeOnDocuments: setting.printBarcodeOnDocuments ?? null,
      verifyItemsBeforeFulfill: setting.verifyItemsBeforeFulfill ?? null,
      barcodeLabelWidth: setting.barcodeLabelWidth ?? null,
      barcodeLabelHeight: setting.barcodeLabelHeight ?? null,
      barcodeWidth: setting.barcodeWidth ?? null,
      barcodeHeight: setting.barcodeHeight ?? null,
      barcodeLabelLeftPadding: setting.barcodeLabelLeftPadding ?? null,
      barcodeLabelGap: setting.barcodeLabelGap ?? null,
      printProductName: setting.printProductName ?? null,
      printVariantName: setting.printVariantName ?? null,
      printRetailPrice: setting.printRetailPrice ?? null,
      printSKU: setting.printSKU ?? null,
      printProductAttributes: setting.printProductAttributes ?? null,
      barcodeLabelColumns: setting.barcodeLabelColumns ?? null,
      multipelUoms: setting.multipelUoms ?? null,
      taxInclusive: setting.taxInclusive ?? null,
      gst: setting.gst ?? null,
      fbrPCTCode: setting.fbrPCTCode ?? null,
      enableCustomOrderStages: setting.enableCustomOrderStages ?? null,
      maxDiscountForReturn: setting.maxDiscountForReturn ?? null,
      paymentDueAlert: setting.paymentDueAlert ?? null,
      lastPaymentAlert: setting.lastPaymentAlert ?? null,
      lockAccount: setting.lockAccount ?? null,
      autoOrderDiscount: setting.autoOrderDiscount ?? null,
      enableMto: setting.enableMto ?? null,
      maxAllowedRefund: setting.maxAllowedRefund ?? null,
      courierServiceSelection: setting.courierServiceSelection ?? null,
      currencyCode: setting.currencyCode ?? null,
      organizationContent: setting.organizationContent ?? null,
      printPackingList: setting.printPackingList ?? null,
      isMultiVendor: setting.isMultiVendor ?? null,
      vendorName: setting.vendorName ?? null,
      pickListSmall: setting.pickListSmall ?? null,
      useMtoImages: setting.useMtoImages ?? null,
      askForCustomer: setting.askForCustomer ?? null,
      askForSalesPerson: setting.askForSalesPerson ?? null,
      enablePosOrderSeq: setting.enablePosOrderSeq ?? null,
      enablePurchaseOrderTypes: setting.enablePurchaseOrderTypes ?? null,
      maxSubOrders: setting.maxSubOrders ?? null,
      softAdjustmentOpeningDate: setting.softAdjustmentOpeningDate
        ? new Date(setting.softAdjustmentOpeningDate)
        : null,
      compactShippingLabel: setting.compactShippingLabel ?? null,
      enablePickerAssignment: setting.enablePickerAssignment ?? null,
      enableSaleOrderAssignment: setting.enableSaleOrderAssignment ?? null,
      saleOrderReAssignment: setting.saleOrderReAssignment ?? null,
      enableAccountCodes: setting.enableAccountCodes ?? null,
      invoiceControlPaymentAccountId: setting.invoiceControlPaymentAccount?.id ?? null,
      invoiceControlPaymentAccountName: setting.invoiceControlPaymentAccount?.name ?? null,
      defaultPriceList: setting.defaultPriceList ?? null,
      shippingLabelDocumentId: setting.shippingLabelDocument?.id ?? null,
      shippingLabelDocumentDescription: setting.shippingLabelDocument?.description ?? null,
      shippingLabelDocumentProductName: setting.shippingLabelDocument?.productName ?? null,
      shippingLabelDocumentProductSku: setting.shippingLabelDocument?.productSku ?? null,
      shippingLabelDocumentRemarks: setting.shippingLabelDocument?.remarks ?? null,
      shippingLabelDocumentPrintBarcode: setting.shippingLabelDocument?.printBarcode ?? null,
      shippingLabelDocumentNumOfLabels: setting.shippingLabelDocument?.numOfLabels ?? null,
      shippingLabelDocumentSortLabelBySku: setting.shippingLabelDocument?.sortLabelBySku ?? null,
      shippingLabelDocumentDefaultRemarks: setting.shippingLabelDocument?.defaultRemarks ?? null,
      stockAllocationRules: setting.stockAllocationRules ?? null,
      isDropShippingAccount: setting.isDropShippingAccount ?? null,
      enableMultiLocationFulfillment: setting.enableMultiLocationFulfillment ?? null,
      applyThreeLevelBuffer: setting.applyThreeLevelBuffer ?? null,
      fbrPosFeeOnlineOrders: setting.fbrPosFeeOnlineOrders ?? null,
      isCustomerRequired: setting.isCustomerRequired ?? null,
      isSalesPersonRequired: setting.isSalesPersonRequired ?? null,
      showCustomerSelectionAlert: setting.showCustomerSelectionAlert ?? null,
      disableManualBarcodeEntryInDispatch: setting.disableManualBarcodeEntryInDispatch ?? null,
      manualCompletionInDispatch: setting.manualCompletionInDispatch ?? null,
      syncDraftQuantityToExternalApps: setting.syncDraftQuantityToExternalApps ?? null,
      splitFulfillment: setting.splitFulfillment ?? null,
      distanceOptimisedFulfillment: setting.distanceOptimisedFulfillment ?? null,
      maxDistanceForFullOrderFulfillment: setting.maxDistanceForFullOrderFulfillment ?? null,
      useSequenceBarcoding: setting.useSequenceBarcoding ?? null,
      duplicateResolutionLimit: setting.duplicateResolutionLimit ?? null,
      receivePurchaseOrderByGrn: setting.receivePurchaseOrderByGrn ?? null,
      productionOrderScanning: setting.productionOrderScanning ?? null,
      useRevisedShippingLabel: setting.useRevisedShippingLabel ?? null,
      allowManualQtyInScan: setting.allowManualQtyInScan ?? null,
      autoReplaceErrorCodeInDispatch: setting.autoReplaceErrorCodeInDispatch ?? null,
    };
  }
}

export const orgAccountSettingService = new OrgAccountSettingService();


