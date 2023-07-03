import { util } from '@aws-appsync/utils'

/**
 * @param {import('@aws-appsync/utils').Context} ctx
 */
export function request(ctx) {
	const topicArn = util.urlEncode(ctx.stash.topicArn)
	const message = util.urlEncode(JSON.stringify(ctx.args))

	let body = `Action=Publish&Version=2010-03-31`
	body +=`&TopicArn=${topicArn}`
	body += `&Message=${message}`

	return {
		version: '2018-05-29',
		method: 'POST',
		resourcePath: '/',
		params: {
			body,
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		},
	}
}

/**
 * @param {import('@aws-appsync/utils').Context} ctx
 */
export function response(ctx) {
	if (ctx.result.statusCode === 200) {
		// Because the response is of type XML, we are going to convert
		// the result body as a map and only get the User object.
		return util.xml.toMap(ctx.result.body).PublishResponse.PublishResult.MessageId
	} else {
		util.appendError(ctx.result.body, ctx.result.statusCode)
	}
}
