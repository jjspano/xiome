
import {PlatformConfig} from "../../auth-types.js"
import {AuthTables} from "../types/auth-tables.js"
import {bakeryForAppTables} from "./bespoke/bakery-for-app-tables.js"
import {prepareNamespacerForTables} from "./generic/prepare-namespacer-for-tables.js"
import {bakeryForPermissionsTables} from "./bespoke/bakery-for-permissions-tables.js"

export function authTablesBakery({config, authTables}: {
			config: PlatformConfig
			authTables: AuthTables
		}) {

	const bakeUserTables = prepareNamespacerForTables(authTables.user)
	const bakeAppTables = bakeryForAppTables({
		config,
		appTables: authTables.app,
	})
	const bakePermissionsTables = bakeryForPermissionsTables({
		config,
		permissionsTables: authTables.permissions,
	})

	return async function bakeTables(appId: string): Promise<AuthTables> {
		return {
			app: await bakeAppTables(),
			user: await bakeUserTables(appId),
			permissions: await bakePermissionsTables(appId),
		}
	}
}
