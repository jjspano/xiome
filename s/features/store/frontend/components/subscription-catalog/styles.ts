
import {css} from "@chasemoskal/magical/x/camel-css/camel-css-lit.js"
export default css`xiome-store-subscription-catalog {

:is(ol, ul) {
	list-style: none;
}

[part="plans"] > li {
	margin-top: 1em;
}

[part="tiers"] {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 0.5em;
	align-items: stretch;
	> span {
		display: block;
	}
	> * {
		max-width: 100%;
	}
}

[part="planlabel"] {
	font-size: 1em;
	padding-bottom: 0.2em;
}

}`
