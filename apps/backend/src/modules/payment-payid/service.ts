import {
  AbstractPaymentProvider,
  PaymentActions,
  BigNumber,
} from "@medusajs/framework/utils"
import type {
  Logger,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"

type PayIdOptions = {
  payid_alias: string
}

type InjectedDependencies = {
  logger: Logger
}

class PayIdPaymentProviderService extends AbstractPaymentProvider<PayIdOptions> {
  static identifier = "payid"
  protected logger_: Logger
  protected options_: PayIdOptions

  constructor(container: InjectedDependencies, options: PayIdOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const ctx = (input as any).context || {}
    const cartId: string | undefined = ctx.cart?.id || ctx.resource_id
    const reference = cartId
      ? `HG-${cartId.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}`
      : `HG-${Date.now().toString(36).toUpperCase().slice(-8)}`

    return {
      id: `payid_${reference}`,
      data: {
        payid_alias: this.options_.payid_alias || process.env.PAYID_ALIAS,
        reference,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return {
      status: "authorized",
      data: input.data || {},
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    this.logger_.info(
      `[PayID] Payment captured: ${JSON.stringify(input.data)}`
    )
    return { data: input.data || {} }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    this.logger_.info(
      `[PayID] Refund of ${input.amount} requested: ${JSON.stringify(input.data)}`
    )
    return { data: input.data || {} }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return { data: input.data || {} }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return { data: input.data || {} }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return { status: "authorized" }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return input.data || {}
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    return {
      data: input.data || {},
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return {
      action: "not_supported",
      data: {
        session_id: "",
        amount: new BigNumber(0),
      },
    }
  }
}

export default PayIdPaymentProviderService
