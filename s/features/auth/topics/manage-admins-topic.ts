
import {asTopic} from "renraku/x/identities/as-topic.js"

import {AuthOptions} from "../auth-types.js"
import {find} from "../../../toolbox/dbby/dbby-helpers.js"
import {UnconstrainedPlatformUserAuth} from "../../../types.js"
import {assertEmailAccount} from "./login/assert-email-account.js"
import {adminRoleId} from "../permissions/standard/build/ids/hard-role-ids.js"
import {requireUserIsAllowedToEditApp} from "./apps/require-user-is-allowed-to-edit-app.js"

export const appTopic = ({
		rando,
		config,
	}: AuthOptions) => asTopic<UnconstrainedPlatformUserAuth>()({

	async listAdmins({access, tables, getAuthTables}, {appId}: {
			appId: string
		}) {
		await requireUserIsAllowedToEditApp({appId, tables, access})
		const tablesForApp = getAuthTables({appId})
		const usersWithAdminRole = await tablesForApp.userHasRole.read(find({
			roleId: adminRoleId
		}))
		const adminsViaEmail = await tablesForApp.accountViaEmail.read(
			find(...usersWithAdminRole.map(({userId}) => ({userId})))
		)
		return adminsViaEmail.map(({userId, email}) => ({
			userId,
			email,
		}))
	},

	async assignAdmin({access, tables, getAuthTables}, {appId, email}: {
			appId: string
			email: string
		}): Promise<void> {
		await requireUserIsAllowedToEditApp({appId, tables, access})
		const tablesForApp = getAuthTables({appId})
		const {userId: adminUserId} = await assertEmailAccount({
			rando,
			config,
			email,
			tables: tablesForApp,
		})
		await tablesForApp.userHasRole.assert({
			...find({userId: adminUserId, roleId: adminRoleId}),
			make: async() => ({
				userId: adminUserId,
				roleId: adminRoleId,
				public: true,
				timeframeEnd: undefined,
				timeframeStart: undefined,
			})
		})
	},

	async revokeAdmin({access, tables, getAuthTables}, {appId, userId}: {
			appId: string
			userId: string
		}): Promise<void> {
		await requireUserIsAllowedToEditApp({appId, tables, access})
		const tablesForApp = getAuthTables({appId})
		await tablesForApp.userHasRole.delete(find({userId, roleId: adminRoleId}))
	},
})
