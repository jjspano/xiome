
import {apiContext} from "renraku/x/api/api-context.js"

import {find} from "../../../../toolbox/dbby/dbby-helpers.js"
import {DamnId} from "../../../../toolbox/damnedb/damn-id.js"
import {apiProblems} from "../../../../toolbox/api-validate.js"
import {StoreServiceOptions} from "./types/store-service-options.js"
import {ApiError} from "../../../../../../renraku/x/api/api-error.js"
import {subscriptionPlanFromRow} from "./utils/subscription-plan-from-row.js"
import {ClerkAuth, ClerkMeta} from "../policies/types/store-metas-and-auths.js"
import {SubscriptionPlanRow} from "../tables/types/rows/subscription-plan-row.js"
import {RoleRow} from "../../../auth2/aspects/permissions/types/permissions-tables.js"
import {SubscriptionPlanDraft} from "../tables/types/drafts/subscription-plan-draft.js"
import {validateSubscriptionPlanDraft} from "./utils/validate-subscription-plan-draft.js"

const hardcodedCurrency = "usd"
const hardcodedInterval = "month"

export const makeShopkeepingService = (
		options: StoreServiceOptions
	) => apiContext<ClerkMeta, ClerkAuth>()({
	policy: options.storePolicies.clerkPolicy,
	expose: {

		async listSubscriptionPlans({storeTables, authTables}) {
			const rows = await storeTables.billing.subscriptionPlans
				.read({conditions: false})

			const roleFinders = rows
				.map(row => row.roleId)
				.map(roleId => ({roleId}))
	
			const roles = await authTables.permissions.role.read(find(...roleFinders))
	
			const plans = rows.map(plan => subscriptionPlanFromRow({
				plan,
				role: roles.find(role => role.roleId === plan.roleId),
			}))

			return plans
		},
	
		async createSubscriptionPlan(
				{stripeLiaisonForApp, storeTables, authTables},
				{draft}: {draft: SubscriptionPlanDraft}
			) {

			apiProblems(validateSubscriptionPlanDraft(draft))

			const stripeProduct = await stripeLiaisonForApp.products.create({
				name: draft.label,
			})

			const stripePrice = await stripeLiaisonForApp.prices.create({
				unit_amount: draft.price,
				currency: hardcodedCurrency,
				recurring: {interval: hardcodedInterval},
			})

			const role: RoleRow = {
				hard: true,
				public: true,
				label: draft.label,
				roleId: options.generateId(),
				assignable: true,
			}
	
			const plan: SubscriptionPlanRow = {
				active: true,
				price: draft.price,
				roleId: role.roleId,
				stripePriceId: stripePrice.id,
				stripeProductId: stripeProduct.id,
				subscriptionPlanId: options.generateId(),
			}

			await Promise.all([
				authTables.permissions.role.create(role),
				storeTables.billing.subscriptionPlans.create(plan),
			])

			return subscriptionPlanFromRow({role, plan})
		},

		async updateSubscriptionPlan(
			{stripeLiaisonForApp, storeTables, authTables},
			{subscriptionPlanId: planIdString, draft}: {
				subscriptionPlanId: string
				draft: SubscriptionPlanDraft
			}) {

			apiProblems(validateSubscriptionPlanDraft(draft))
			const subscriptionPlanId = DamnId.fromString(planIdString)
	
			const stripeNewPrice = await stripeLiaisonForApp.prices.create({
				unit_amount: draft.price,
				currency: hardcodedCurrency,
				recurring: {interval: hardcodedInterval},
			})

			await storeTables.billing.subscriptionPlans.update({
				...find({subscriptionPlanId}),
				write: {
					stripePriceId: stripeNewPrice.id,
					price: stripeNewPrice.unit_amount,
				},
			})

			const plan = await storeTables.billing.subscriptionPlans
				.one(find({subscriptionPlanId}))

			await authTables.permissions.role.update({
				...find({roleId: plan.roleId}),
				write: {label: draft.label},
			})

			const role = await authTables.permissions.role
				.one(find({roleId: plan.roleId}))
	
			return subscriptionPlanFromRow({role, plan})
		},

		async deactivateSubscriptionPlan(
				{stripeLiaisonForApp, storeTables},
				{subscriptionPlanId: planIdString}: {subscriptionPlanId: string},
			) {

			const subscriptionPlanId = DamnId.fromString(planIdString)
			const {stripePriceId} = await storeTables.billing.subscriptionPlans
				.one(find({subscriptionPlanId}))
	
			await stripeLiaisonForApp.prices
				.update(stripePriceId, {active: false})
	
			// TODO cancel all stripe subscriptions
	
			await storeTables.billing.subscriptionPlans.update({
				...find({subscriptionPlanId}),
				write: {active: false},
			})
		},

		async deleteSubscriptionPlan(
				{storeTables, authTables},
				{subscriptionPlanId: planIdString}: {subscriptionPlanId: string}
			) {

			const subscriptionPlanId = DamnId.fromString(planIdString)
			const {roleId, active} = await storeTables.billing.subscriptionPlans
				.one(find({subscriptionPlanId}))

			if (active)
				throw new ApiError(400, `deleting active subscriptions is forbidden`)

			await Promise.all([
				authTables.permissions.role.delete(find({roleId})),
				storeTables.billing.subscriptionPlans.delete(find({subscriptionPlanId})),
			])
		},
	},
})
