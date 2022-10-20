
import {html} from "lit"
import {property} from "lit/decorators.js"

import {TierView} from "../../views/tier/view.js"
import {makeStoreModel} from "../../model/model.js"
import {TierBasics} from "../../views/tier/types.js"
import {ops, Op} from "../../../../../framework/ops.js"
import {renderOp} from "../../../../../framework/op-rendering/render-op.js"
import {SubscriptionPlan, SubscriptionTier} from "../../../isomorphic/concepts.js"
import {ascertainTierContext} from "../../views/tier/utils/ascertain-tier-context.js"
import {ModalSystem} from "../../../../../assembly/frontend/modal/types/modal-system.js"
import {mixinStyles, mixinRequireShare, Component} from "../../../../../framework/component.js"
import {ascertainTierInteractivity} from "../../views/tier/utils/apprehend-tier-interactivity.js"

import styles from "./styles.js"

@mixinStyles(styles, TierView.css)
export class XiomeStoreSubscriptionCatalog extends mixinRequireShare<{
		modals: ModalSystem
		storeModel: ReturnType<typeof makeStoreModel>
	}>()(Component) {

	@property({type: String})
	["allow-plans"]: string

	get #plans() {
		const allowedPlans = this["allow-plans"]?.match(/(\w+)/g)
		const plans = this.share.storeModel.get.subscriptions.plans ?? []
		const activePlans = plans
			.filter(plan => !plan.archived)
			.filter(plan => plan.tiers.length)
		return !!this["allow-plans"]
			? activePlans.filter(plan => allowedPlans.includes(plan.planId))
			: activePlans
	}

	@property()
	private op: Op<void> = ops.ready(undefined)

	#renderTier(plan: SubscriptionPlan, tier: SubscriptionTier) {
		const {storeModel, modals} = this.share
		const {mySubscriptionDetails} = storeModel.get.subscriptions
		const subscription =
			mySubscriptionDetails
				.find(s => s.planId === plan.planId)

		const basics: TierBasics = {
			plan,
			tier,
			subscription,
		}

		const context = ascertainTierContext(basics)

		const interactivity = ascertainTierInteractivity({
			basics,
			context,
			modals,
			storeModel,
			setOp: op => this.op = op,
		})

		return TierView({
			context,
			interactivity,
			basics: {tier, plan, subscription},
		})
	}

	#renderPlan = (plan: SubscriptionPlan) => {
		return html`
			<li data-plan=${plan.planId} part=plan>
				<h3 part=planlabel>${plan.label}</h3>
				<div class=tiers part=tiers>
					${
						plan.tiers
							.filter(tier => tier.active)
							.map(tier => this.#renderTier(plan, tier))
					}
				</div>
			</li>
		`
	}

	render() {
		const {state} = this.share.storeModel
		return renderOp(
			ops.combine(
				this.op,
				state.subscriptions.subscriptionPlansOp,
				state.subscriptions.mySubscriptionDetailsOp,
			),
			() => html`
				<ol class=plans>
					${this.#plans.map(this.#renderPlan)}
				</ol>
			`
		)
	}
}
