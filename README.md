# rapids-v1

Functions to interact with the rapids-v1 architecture, the purpose of this repo is to simplify the interface to emit and listen events and reduce boilerplate.


## Usage

```
npm install @jesusdalvarado/rapids-v1
```

```
const {emit, listen } = require('@jesusd.alvarado/rapids-v1')

const SUBSCRIBED_CLOUDEVENT_TYPES = [
	'cmd.add-to-google-sheet.v0',
	'fct.added-to-google-sheet.v0',
	'fct.failed-added-to-google-sheet.v0',
]

const DOCUMENT_ID = '1OWLqf4yayCwwd1xxFnVJEmgoy8Y1MtfoMETDvP8wU2A'

listen({
  handler: ({ cloudevent }) => {
    console.log(`\n--- Receiving ${cloudevent.type} ---`)
    console.log(cloudevent)
  },
  type: SUBSCRIBED_CLOUDEVENT_TYPES,
})

emit({
	data: JSON.stringify({
		documentId: DOCUMENT_ID,
		row: { datetime: new Date().toUTCString() }
	}),
	type: 'cmd.add-to-google-sheet.v0',
})
```