const { Cloudevent } = require('@1mill/cloudevents')
const { Lambda } = require('@1mill/lambda')
const Ably = require('ably')
const { Sops } = require('@1mill/sops')

const ABLY_DEVELOPMENT_CHANNEL_NAME = 'development:rapids-v1:2021-09-12'

const emit = async ({ data, type }) => {

  if (process.env.NODE_ENV === 'development') { console.log(`Emitting ${type} data: ${data}`) }

  const lambda = new Lambda({})
  await lambda.invoke({
    cloudevent: new Cloudevent({data, type}),
    functionName: 'rapids-v1-hydrator-v0',
  })
}

const listen = async ({ type, handler }) => {
  const SUBSCRIBED_CLOUDEVENT_TYPES = type

  if (!type) { throw new Error('Function "handler" is required') }
  if (!handler) { throw new Error('String "type" is required, you can also use an array of strings') }

  if (process.env.NODE_ENV === 'development') { console.log(`Starting ably subscriptions ... Subscribing to ${type}`) }

  const sops = new Sops({})
	const ably = new Ably.Realtime.Promise(await sops.decrypt('ABLY_API_KEY'))
	const channel = await ably.channels.get(ABLY_DEVELOPMENT_CHANNEL_NAME)
	await channel.subscribe(SUBSCRIBED_CLOUDEVENT_TYPES, async ({ data: { cloudevent }}) => {
    await handler({ cloudevent })
	})
}

module.exports = {
  emit,
  listen,
}
