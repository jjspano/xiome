
import {ops} from "../../../../../framework/ops.js"
import {makeStoreModel} from "../../model/model.js"
import {html} from "../../../../../framework/component.js"
import {component} from "../../../../../toolbox/magical-component.js"
import {TemplateSlots} from "../../../../../toolbox/template-slots.js"
import {getOngoingSubscriptions} from "./utils/get-ongoing-subscriptions.js"
import {renderOp} from "../../../../../framework/op-rendering/render-op.js"
import {ascertainTierContext} from "../../views/tier/utils/ascertain-tier-context.js"

import styles from "./styles.js"
import {setupRerenderingOnSnapstateChanges} from "../../utils/setup-rerendering-on-snapstate-changes.js"

export const XiomeStoreSubscriptionStatus = ({storeModel}: {
	storeModel: ReturnType<typeof makeStoreModel>
}) =>

component({
	styles,
	shadow: false,
	properties: {},
},

use => {
	setupRerenderingOnSnapstateChanges(use, storeModel.snap)

	const [slots] = use.state(() => new TemplateSlots(
		use.element,
		() => use.element.requestUpdate(),
	))

	const {
		stripeConnect: {connectStatusOp},
		subscriptions: {subscriptionPlansOp, mySubscriptionDetailsOp},
	} = storeModel.state

	const op = ops.combine(
		subscriptionPlansOp,
		mySubscriptionDetailsOp,
		connectStatusOp,
	)

	console.log({
		op: ops.debug(op),
		subscriptionPlansOp: ops.debug(op),
		mySubscriptionDetailsOp: ops.debug(op),
		connectStatusOp: ops.debug(op),
	})

	return renderOp(op, () => html`
		<div data-card-list>
			${getOngoingSubscriptions(storeModel).map(basics => html`
				<div data-card>
					<strong data-plan-label>${basics.plan.label}</strong>
					<xiome-store-subscription-tier
						.basics=${basics}
						.context=${ascertainTierContext(basics)}>
							${slots.get(basics.tier.tierId)}
					</xiome-store-subscription-tier>
				</div>
			`)}
		</div>
	`)
})
