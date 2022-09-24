
import {ModalSystem} from "../../../../../assembly/frontend/modal/types/modal-system.js"
import {html} from "../../../../../framework/component.js"
import {makeSubscriptionsSubmodel} from "../../../models/submodels/subscriptions-submodel.js"
import {SubscriptionTier} from "../../../types/store-concepts.js"
import {centsToDollars} from "../../subscription-planning/ui/price-utils.js"

export function preparePurchaseActions({
		modals, buttonLabel, tier, subscriptions
	}:{
		modals: ModalSystem
		buttonLabel: string
		tier: SubscriptionTier
		subscriptions: ReturnType<typeof makeSubscriptionsSubmodel>
	}) {

	const {tierId} = tier
	return {
		upgradeOrDowngrade: async () => {
			const proceedWithPurchase = await modals.confirm({
				title: `${buttonLabel} subscription`,
				body: html`are you sure you want to ${buttonLabel} your subscription to <strong>${tier.label}</strong> for $${centsToDollars(tier.pricing.price)}/month?`
			})
			if(proceedWithPurchase) {
				await subscriptions.purchase(tierId)
				modals.alert({
					title: html`your subscription ${buttonLabel} to <strong>${tier.label}</strong> was successfull`
				})
			}
		},
		buySubscriptionWithCheckoutPopup: async () => {
			await subscriptions.purchase(tierId)
		},
		buySubscriptionWithExistingPaymentMethod: async () => {
			const proceedWithPurchase = await modals.confirm({
				title: `${buttonLabel} subscription`,
				body: html`are you sure you want to ${buttonLabel} <strong>${tier.label}</strong> for $${centsToDollars(tier.pricing.price)}/month?`
			})
			if(proceedWithPurchase) await subscriptions.purchase(tierId)
		}
	}
}


export enum PurchaseScenario {
  Update,
  UsePaymentMethod,
  CheckoutPopup,
}

export function determinePurchaseScenerio({
		hasDefaultPaymentMethod, hasExistingSubscription
	}: {
		hasDefaultPaymentMethod: boolean
		hasExistingSubscription: boolean
	}): PurchaseScenario {

		if (hasExistingSubscription) {
			return PurchaseScenario.Update
		}
		else {
			if (hasDefaultPaymentMethod) {
				return PurchaseScenario.UsePaymentMethod
			}
			else {
				return PurchaseScenario.CheckoutPopup
			}
		}
}
