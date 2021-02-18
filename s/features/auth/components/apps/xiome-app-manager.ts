
import styles from "./xiome-app-manager.css.js"
import {renderXiomeConfig} from "./utils/render-xiome-config.js"

import {multistate} from "../../../../toolbox/multistate.js"
import {WiredComponent, html, mixinStyles} from "../../../../framework/component.js"
import {renderWrappedInLoading} from "../../../../framework/loading/render-wrapped-in-loading.js"

import {makeAppForm} from "./form/app-form.js"
import {formDraftToAppDraft} from "./form/utils/form-draft-to-app-draft.js"
import {appDisplayToFormDraft} from "./form/utils/app-display-to-form-draft.js"

import {makeAdminManager} from "./admins/admin-manager.js"

import {AppModel} from "../../types/app-model.js"
import {AppDisplay} from "../../types/apps/app-display.js"

@mixinStyles(styles)
export class XiomeAppManager extends WiredComponent<{appModel: AppModel}> {

	firstUpdated(changes: any) {
		super.firstUpdated(changes)
		this.share.appModel.loadAppList()
	}

	private appRegistrationForm = makeAppForm({
		clearOnSubmit: true,
		submitButtonText: "create community",
		requestUpdate: () => this.requestUpdate(),
		query: selector => (
			this.shadowRoot
				.querySelector(".app-registration")
				.querySelector(selector)
		),
		submit: async formDraft => {
			const appDraft = formDraftToAppDraft(formDraft)
			await this.share.appModel.registerApp(appDraft)
		},
	})

	private getAppForm = (multistate<
			AppDisplay,
			ReturnType<typeof makeAppForm>
		>(
			app => makeAppForm({
				clearOnSubmit: false,
				submitButtonText: "save changes",
				initialValues: appDisplayToFormDraft(app),
				requestUpdate: () => this.requestUpdate(),
				query: selector => (
					this.shadowRoot
						.querySelector(`.app[data-app-id="${app.appId}"] .app-editor`)
						.querySelector(selector)
				),
				submit: async formDraft => {
					const appDraft = formDraftToAppDraft(formDraft)
					await this.share.appModel.updateApp(app.appId, appDraft)
				},
			})
		)
	)

	private getAdminManager = (multistate<
			AppDisplay,
			ReturnType<typeof makeAdminManager>
		>(
			app => {
				const adminManager = makeAdminManager({
					app,
					manageAdminsService: this.share.appModel.manageAdminsService,
					query: selector => this.shadowRoot
						.querySelector(`.app[data-app-id="${app.appId}"] .adminmanager`)
						.querySelector(selector)
				})
				adminManager.controls.listAdmins()
				return adminManager
			}
		)
	)

	private deleteApp = async(appId: string) => {
		await this.share.appModel.deleteApp(appId)
	}

	private renderNoApps() {
		return html`
			<slot name=no-apps></slot>
		`
	}

	private renderAppList(appList: AppDisplay[]) {
		return html`
			<slot></slot>
			<div class=app-list>
				${appList.map(app => this.renderApp(app))}
			</div>
		`
	}

	private renderApp(app: AppDisplay) {
		const appForm = this.getAppForm(app)
		const adminManager = this.getAdminManager(app)
		return html`
			<div class=app data-app-id=${app.appId}>

				<div class=app-header part=app-header>
					<div class=title>
						<h3>
							<a part=link target=_blank href="${app.home}">
								${app.label}
							</a>
						</h3>
					</div>
					<div class=stats>
						<div data-stat=users>
							<span>${app.stats.users.toLocaleString()}</span>
							<span>users</span>
						</div>
						<div data-stat=monthly-active>
							<span>${app.stats.usersActiveMonthly.toLocaleString()}</span>
							<span>monthly active</span>
						</div>
						<div data-stat=active-last-day>
							<span>${app.stats.usersActiveDaily.toLocaleString()}</span>
							<span>daily active</span>
						</div>
					</div>
				</div>

				<div class=twoside>
					<div class=app-editor>
						<h4>edit community details</h4>
						${appForm.render({partNamespace: "appeditor"})}
					</div>
					<div class=app-options>
						<div class=app-code>
							<h4>install with html</h4>
							<code class=htmlcode>
								${renderXiomeConfig(app.appId)}
							</code>
						</div>
						<div class=adminmanager>
							${adminManager.render()}
						</div>
					</div>
				</div>

				<div class=finalbox>
					<xio-button
						class=delete-app-button
						@press=${() => this.deleteApp(app.appId)}>
							delete community
					</xio-button>
				</div>
			</div>
		`
	}

	render() {
		const {appListLoadingView} = this.share.appModel
		return html`
			${renderWrappedInLoading(appListLoadingView, appList => appList.length
				? this.renderAppList(appList)
				: this.renderNoApps())}
			<div class=app-registration>
				<slot name="register-app-heading"></slot>
				${this.appRegistrationForm.render({partNamespace: "appregistration"})}
			</div>
		`
	}
}
