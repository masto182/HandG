import { Heading, Text } from "@modules/common/components/ui"
import TransferActions from "@modules/order/components/transfer-actions"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-hg-text">
          Transfer request for order {id}
        </Heading>
        <Text className="text-hg-text-secondary">
          You&#39;ve received a request to transfer ownership of your order ({id}).
          If you agree to this request, you can approve the transfer by clicking
          the button below.
        </Text>
        <div className="w-full h-px bg-hg-border" />
        <Text className="text-hg-text-secondary">
          If you accept, the new owner will take over all responsibilities and
          permissions associated with this order.
        </Text>
        <Text className="text-hg-text-secondary">
          If you do not recognize this request or wish to retain ownership, no
          further action is required.
        </Text>
        <div className="w-full h-px bg-hg-border" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}
