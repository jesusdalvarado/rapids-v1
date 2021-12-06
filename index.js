const { Cloudevent } = require('@1mill/cloudevents')
const { Lambda } = require('@1mill/lambda')
const Ably = require('ably')
const { Sops } = require('@1mill/sops')

process.env.MILL_CLOUDEVENTS_SOURCE = process.env.MILL_CLOUDEVENTS_SOURCE || process.env.JESUS_MILL_CLOUDEVENTS_SOURCE || process.env.VUE_APP_JESUS_MILL_CLOUDEVENTS_SOURCE
process.env.MILL_LAMBDA_AWS_ENDPOINT = process.env.MILL_LAMBDA_AWS_ENDPOINT || process.env.JESUS_MILL_LAMBDA_AWS_ENDPOINT || process.env.VUE_APP_JESUS_MILL_LAMBDA_AWS_ENDPOINT
process.env.MILL_LAMBDA_AWS_ACCESS_KEY_ID = process.env.MILL_LAMBDA_AWS_ACCESS_KEY_ID || process.env.JESUS_MILL_LAMBDA_AWS_ACCESS_KEY_ID || process.env.VUE_APP_AWS_ACCESS_KEY_ID
process.env.MILL_LAMBDA_AWS_REGION = process.env.MILL_LAMBDA_AWS_REGION || process.env.JESUS_MILL_LAMBDA_AWS_REGION || process.env.VUE_APP_AWS_DEFAULT_REGION
process.env.MILL_LAMBDA_AWS_SECRET_ACCESS_KEY = process.env.MILL_LAMBDA_AWS_SECRET_ACCESS_KEY || process.env.JESUS_MILL_LAMBDA_AWS_SECRET_ACCESS_KEY || process.env.VUE_APP_AWS_SECRET_ACCESS_KEY
process.env.MILL_SOPS_AWS_ACCESS_KEY_ID = process.env.MILL_SOPS_AWS_ACCESS_KEY_ID || process.env.JESUS_MILL_SOPS_AWS_ACCESS_KEY_ID || process.env.VUE_APP_AWS_ACCESS_KEY_ID
process.env.MILL_SOPS_AWS_REGION = process.env.MILL_SOPS_AWS_REGION || process.env.JESUS_MILL_SOPS_AWS_REGION || process.env.VUE_APP_AWS_DEFAULT_REGION
process.env.MILL_SOPS_AWS_SECRET_ACCESS_KEY = process.env.MILL_SOPS_AWS_SECRET_ACCESS_KEY || process.env.JESUS_MILL_SOPS_AWS_SECRET_ACCESS_KEY || process.env.VUE_APP_AWS_SECRET_ACCESS_KEY

const ABLY_CHANNEL = process.env.JESUS_ABLY_CHANNEL || (process.env.NODE_ENV === 'development') ? 'development:rapids-v1:2021-09-12' : 'production:rapids-v1:2021-09-12'
const inVue = (process.env.VUE_APP_AWS_ACCESS_KEY_ID)
const sops = new Sops({})
const lambda

if (inVue) {
  lambda = new Lambda({
    accessKeyId: process.env.VUE_APP_AWS_ACCESS_KEY_ID,
    endpoint: process.env.VUE_APP_JESUS_MILL_LAMBDA_AWS_ENDPOINT || null,
    region: process.env.VUE_APP_AWS_DEFAULT_REGION,
    secretAccessKey: process.env.VUE_APP_AWS_SECRET_ACCESS_KEY,
  })
} else {
  lambda = new Lambda({})
}

const emit = async ({
  data,
  type,
  source,
  originid,
  originsource,
  origintype
}) => {

  if (process.env.NODE_ENV === 'development') { console.log(`Emitting ${type} data: ${data}`) }

  source = source || (typeof(window) !== 'undefined' ? window.location.href : `${process.env.JESUS_MILL_CLOUDEVENTS_SOURCE}-source`)

  await lambda.invoke({
    cloudevent: new Cloudevent({ data, type, source, originid, originsource, origintype }),
    functionName: 'rapids-v1-hydrator-v0',
  })
}

const listen = async ({ type, handler }) => {
  const SUBSCRIBED_CLOUDEVENT_TYPES = type

  if (!type) { throw new Error('Function "handler" is required') }
  if (!handler) { throw new Error('String "type" is required, you can also use an array of strings') }

  if (process.env.NODE_ENV === 'development') { console.log(`Starting ably subscriptions ... Subscribing to ${type}`) }

  const ably = new Ably.Realtime.Promise(await sops.decrypt('ABLY_API_KEY'))
	const channel = await ably.channels.get(ABLY_CHANNEL)
	await channel.subscribe(SUBSCRIBED_CLOUDEVENT_TYPES, async ({ data: { cloudevent }}) => {
    await handler({ cloudevent })
	})
}

const getFuncName = async ({ type, source }) => {
  const getFuncNameEvent = new Cloudevent({
    data: JSON.stringify({ type }),
    type: 'GET-FUNCTION-NAME',
    source
  })
  functionName = await lambda.invoke({
    cloudevent: getFuncNameEvent,
    functionName: 'rapids-v1-hydrator-v0',
    invocationType: 'RequestResponse',
  })

  return functionName
}

const request = async ({
  data,
  type,
  source,
  originid,
  originsource,
  origintype
}) => {
  const inDev = process.env.NODE_ENV === "development"

  source = source || (typeof(window) !== 'undefined' ? window.location.href : `${process.env.JESUS_MILL_CLOUDEVENTS_SOURCE}-source`)

  if (inDev) { const functionName = await getFuncName({ type, source }) }

	const cloudevent = new Cloudevent({
    data,
    type,
    source,
    originid,
    originsource,
    origintype
  })

  if (inDev) { console.log(`\n--- Requesting ${functionName} ---\n`, cloudevent) }

	const response = await lambda.invoke({
		cloudevent: cloudevent,
    functionName: inDev ? functionName : type,
		invocationType: 'RequestResponse',
	})

	return response
}

module.exports = {
  emit,
  listen,
  request,
}
