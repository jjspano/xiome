
import {ops} from "../../../../framework/ops.js"
import {makeStoreModel} from "../../models/store-model.js"
import {renderOp} from "../../../../framework/op-rendering/render-op.js"
import {centsToDollars} from "../subscription-planning/ui/price-utils.js"
import {ModalSystem} from "../../../../assembly/frontend/modal/types/modal-system.js"
import {SubscriptionPlan, SubscriptionStatus, SubscriptionTier} from "../../types/store-concepts.js"
import {Component, html, mixinRequireShare, mixinStyles} from "../../../../framework/component.js"

import xiomeSubscriptionsCss from "./xiome-subscriptions.css.js"

// // TODO multisub: maybe use a magical view somewhere if you want?
// import {view} from "@chasemoskal/magical/x/view/view.js"

@mixinStyles(xiomeSubscriptionsCss)
export class XiomeSubscriptions extends mixinRequireShare<{
		modals: ModalSystem
		storeModel: ReturnType<typeof makeStoreModel>
	}>()(Component) {

	get #state() {
		return this.share.storeModel.snap.readable
	}

	get #plans() {
		const plans = ops.value(this.#state.subscriptions.subscriptionPlansOp)
			?? []
		return plans
			.filter(plan => plan.active)
			.filter(plan => plan.tiers.length)
	}

	get #subscriptions() {
		return ops.value(this.#state.subscriptions.mySubscriptionDetailsOp)
	}

	#prepareTierManager(
			{tierId}: SubscriptionTier,
			isSubscribedToThisTier: boolean,
			planHasSubscription: boolean
		) {
		const tierSubscriptionDetails = this.#subscriptions.find(
			subscription => subscription.tierId === tierId
		)
		const subscriptionStatus = tierSubscriptionDetails?.status
			?? SubscriptionStatus.Unsubscribed
		const {subscriptions} = this.share.storeModel
		return {
			isSubscribedToThisTier,
			isCanceled: subscriptionStatus === SubscriptionStatus.Cancelled,
			isUnpaid: subscriptionStatus === SubscriptionStatus.Unpaid,
			handleTierClick: async() => {
				switch (subscriptionStatus) {

					case SubscriptionStatus.Unsubscribed: // "buy" button
						return subscriptions.purchase(tierId)
						// return planHasSubscription
						// 	? subscriptions.updateExistingSubscriptionWithNewTier(tierId)
						// 	: subscriptions.checkoutSubscriptionTier(tierId)

					case SubscriptionStatus.Active: // "cancel" button
						return subscriptions.cancelSubscription(tierId)

					case SubscriptionStatus.Unpaid: // "pay invoice" button
						return subscriptions.purchase(tierId)
						// return subscriptions.checkoutSubscriptionTier(tierId)

					case SubscriptionStatus.Cancelled: // "renew" button
						return subscriptions.uncancelSubscription(tierId)

					default:
						throw new Error("unknown subscription status")
				}
				// // unsubscribed -> "buy"
				// // unpaid -> "pay invoice" (subscribe not paid)
				// // active -> "cancel"
				// // cancelled -> "renew"

				// if (isSubscribedToThisTier && !isUnpaid) {
				// 	!isCanceled
				// 		? await subscriptions.cancelSubscription(tierId)
				// 		: await subscriptions.uncancelSubscription(tierId)
				// }
				// else {
				// 	if (planHasSubscription) {
				// 		if (paymentMethod) {
				// 			await subscriptions
				// 				.updateExistingSubscriptionWithNewTier(tierId)
				// 		}
				// 		else {
				// 			await billing.checkoutPaymentMethod()
				// 			await subscriptions
				// 				.updateExistingSubscriptionWithNewTier(tierId)
				// 		}
				// 	}
				// 	else {
				// 		if (paymentMethod) {
				// 			await subscriptions.createNewSubscriptionForTier(tierId)
				// 		}
				// 		else {
				// 			await subscriptions.checkoutSubscriptionTier(tierId)
				// 		}
				// 	}
				// }
			},
		}
	}

	#renderTier = ({
			tier, tierIndex,
			subscribedTierIndex,
			planHasSubscription: planHasSubScription
		}: {
			tier: SubscriptionTier
			tierIndex: number
			subscribedTierIndex: number | undefined
			planHasSubscription: boolean
		}) => {
		const isSubscribed = tierIndex === subscribedTierIndex
		const {
			handleTierClick,
			isSubscribedToThisTier,
			isCanceled,
			isUnpaid,
		} = this.#prepareTierManager(tier, isSubscribed, planHasSubScription)

		const planIsUnsubscribed = subscribedTierIndex === undefined

		const [state, action]: [string | null, string] =
			planIsUnsubscribed
				? [null, "buy"]
				: isSubscribedToThisTier
					? isUnpaid
						? ["payment failed", "pay now"]
						: isCanceled
							? ["cancelled", "renew"]
							: ["purchased", "cancel"]
					: (subscribedTierIndex > tierIndex)
						? [null, "downgrade"]
						: [null, "upgrade"]

		return html`
			<div
				class="tier"
				data-tier=${tier.tierId}
				?data-subscribed=${isSubscribedToThisTier}>
				<slot name="${tier.tierId}"></slot>
				<div class=details>
					<h2>${tier.label}</h2>
					<xio-price-display
						unit-superscript
						vertical-currency
						value=${centsToDollars(tier.pricing.price)}>
						${tier.label}
					</xio-price-display>
					<p>monthly</p>
				</div>
				<div class=label>
					${state}
					<button
						@click=${handleTierClick}>
						${action}
					</button>
				</div>
			</div>
		`
	}

	#renderPlan = (plan: SubscriptionPlan) => {
		const tiers = plan.tiers.filter(tier => tier.active)
		const planHasSubscription = tiers.some(tier =>
			this.#subscriptions.some(item => item.tierId === tier.tierId)
		)
		let subscribedTierIndex = undefined as number
		for (const [index, tier] of tiers.entries()) {
			const details = this.#subscriptions.find(
				subscription => subscription.tierId === tier.tierId
			)
			if (details) subscribedTierIndex = index
		}
		return html`
			<li data-plan=${plan.planId}>
				<p>${plan.label}</p>
				<div class=tiers>
					${plan.tiers
						.filter(tier => tier.active)
						.map((tier, tierIndex) => this.#renderTier({
							tier, tierIndex, subscribedTierIndex, planHasSubscription
						}))}
				</div>
			</li>
		`
	}

	render() {
		return renderOp(
			ops.combine(
				this.#state.subscriptions.subscriptionPlansOp,
				this.#state.subscriptions.mySubscriptionDetailsOp,
			),
			() => html`
				<ol class=plans>
					${this.#plans.map(this.#renderPlan)}
				</ol>
			`
		)
	}
}
