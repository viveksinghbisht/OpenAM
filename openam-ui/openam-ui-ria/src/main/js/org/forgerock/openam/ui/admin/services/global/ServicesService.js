/**
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.0.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.0.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2016 ForgeRock AS.
 */

/**
 * @module org/forgerock/openam/ui/admin/services/global/ServicesService
 */
define([
    "jquery",
    "lodash",
    "org/forgerock/commons/ui/common/main/AbstractDelegate",
    "org/forgerock/commons/ui/common/util/Constants",
    "org/forgerock/openam/ui/common/models/JSONSchema",
    "org/forgerock/openam/ui/common/models/JSONValues",
    "org/forgerock/openam/ui/common/services/fetchUrl",
    "org/forgerock/openam/ui/common/util/Promise",
    "org/forgerock/openam/ui/common/util/RealmHelper"
], ($, _, AbstractDelegate, Constants, JSONSchema, JSONValues, fetchUrl, Promise) => {
    const obj = new AbstractDelegate(`${Constants.host}/${Constants.context}/json`);

    const getServiceSchema = function (type) {
        return obj.serviceCall({
            url: fetchUrl.default(`/global-config/services/${type}?_action=schema`, { realm: false }),
            headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
            type: "POST"
        }).then((response) => {
            return new JSONSchema(response);
        });
    };
    const getServiceSubSchema = function (serviceType, subSchemaType) {
        return obj.serviceCall({
            url: fetchUrl.default(
                `/global-config/services/${serviceType}/${subSchemaType}?_action=schema`, { realm: false }),
            headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
            type: "POST"
        }).then((response) => new JSONSchema(response));
    };

    obj.instance = {
        getAll () {  // TODO this is the only difference in GLOBAL and REALM service rest calls
            return obj.serviceCall({
                url: fetchUrl.default("/global-config/services?_action=nextdescendents", { realm: false }),
                type: "POST",
                headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" }
            }).then((response) =>
                _(response.result).map((item) => {
                    item["name"] = item._type.name;
                    return item;
                }).sortBy("name").value()
            );
        },
        get (type) {
            const getInstance = () => obj.serviceCall({
                url: fetchUrl.default(`/global-config/services/${type}`, { realm: false }),
                headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" }
            });

            return Promise.all([getServiceSchema(type), getInstance()]).then((response) => ({
                name: response[1][0]._type.name,
                schema: response[0],
                values: new JSONValues(response[1][0])
            }));
        },
        getInitialState (type) {
            function getTemplate () {
                return obj.serviceCall({
                    url: fetchUrl.default(`/global-config/services/${type}?_action=template`, { realm: false }),
                    headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                    type: "POST"
                }).then((response) => new JSONValues(response));
            }

            return Promise.all([getServiceSchema(type), getTemplate()]).then((response) => ({
                schema: response[0],
                values: response[1]
            }));
        },
        update (type, data) {
            return obj.serviceCall({
                url: fetchUrl.default(`/global-config/services/${type}`, { realm: false }),
                headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                type: "PUT",
                data: new JSONValues(data).toJSON()
            }).then((response) => new JSONValues(response));
        },
        create (type, data) {
            return obj.serviceCall({
                url: fetchUrl.default(`/global-config/services/${type}?_action=create`, { realm: false }),
                headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                type: "POST",
                data: JSON.stringify(data)
            });
        }
    };

    obj.type = {
        getCreatables () {
            return obj.serviceCall({
                url: fetchUrl.default("/global-config/services?_action=getCreatableTypes&forUI=true", { realm: false }),
                headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                type: "POST"
            }).then((response) => _.sortBy(response.result, "name"));
        },
        subSchema: {
            type: {
                getAll (serviceType) {
                    return obj.serviceCall({
                        url: fetchUrl.default(
                            `/global-config/services/${serviceType}?_action=getAllTypes`, { realm: false }),
                        headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                        type: "POST"
                    }).then((response) => response.result);
                },
                getCreatables (serviceType) {
                    return obj.serviceCall({
                        url: fetchUrl.default(
                            `/global-config/services/${serviceType}?_action=getCreatableTypes`, { realm: false }),
                        headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                        type: "POST"
                    }).then((response) => _.sortBy(response.result, "name"));
                },
                // TODO 'subSchema' block below contains mock data, update it as part of 2 following issues:
                // AME-11854 [REST SMS] make sure that calls to sub-sub configuration return correct data
                // AME-11868 Update sub-sub schema view with correct server calls
                subSchema: {
                    type: {
                        getAll (serviceType) {
                            const response = { result: [] };
                            if (serviceType === "scripting") {
                                response.result = [{ "_id": "mock", "name": "mock", "collection": true }];
                            }
                            return $.Deferred().resolve(response).then((response) => response.result);
                        },
                        getCreatables () {
                            return $.Deferred().resolve({ result: [] }).then((response) => response.result);
                        }
                    },
                    instance: {
                        getAll (serviceType) {
                            const response = { result: [] };
                            if (serviceType === "scripting") {
                                response.result = [{ "_id": "mockEngineConfig", "_type": { "_id": "mockEngine",
                                    "name": "Mock Engine Name" } }];
                            }
                            return $.Deferred().resolve(response).then((response) => _.sortBy(response.result, "_id"));
                        },
                        get () {
                            return $.Deferred().resolve({
                                schema: new JSONSchema({ "properties": { "mockField": { type: "string", title:
                                    "mock title" } }, type: "object" }),
                                values: new JSONValues({ "mockField": "mock value" })
                            });
                        },
                        update () {
                            return $.Deferred().resolve({
                                schema: new JSONSchema({ "properties": { "mockField": { type: "string", title:
                                    "mock title" } }, type: "object" }),
                                values: new JSONValues({ "mockField": "mock value" })
                            });
                        }
                    }
                }
            },
            instance: {
                getAll (serviceType) {
                    return obj.serviceCall({
                        url: fetchUrl.default(
                            `/global-config/services/${serviceType}?_action=nextdescendents`, { realm: false }),
                        headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                        type: "POST"
                    }).then((response) => _.sortBy(response.result, "_id"));
                },
                get (serviceType, subSchemaType, subSchemaInstance) {
                    function getInstance () {
                        return obj.serviceCall({
                            url: fetchUrl.default(
                                `/global-config/services/${serviceType}/${subSchemaType}/${subSchemaInstance}`,
                                { realm: false }),
                            headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" }
                        }).then((response) => new JSONValues(response));
                    }

                    return Promise.all([getServiceSubSchema(serviceType, subSchemaType), getInstance()])
                        .then((response) => ({
                            schema: response[0],
                            values: response[1]
                        }));
                },

                getInitialState (serviceType, subSchemaType) {
                    function getTemplate (serviceType, subSchemaType) {
                        return obj.serviceCall({
                            url: fetchUrl.default(
                                `/global-config/services/${serviceType}/${subSchemaType}?_action=template`,
                                { realm: false }),
                            headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                            type: "POST"
                        }).then((response) => new JSONValues(response));
                    }

                    return Promise.all([
                        getServiceSubSchema(serviceType, subSchemaType),
                        getTemplate(serviceType, subSchemaType)
                    ]).then((response) => ({
                        schema: response[0],
                        values: response[1]
                    }));
                },

                remove (serviceType, subSchemaType, subSchemaInstance) {
                    return obj.serviceCall({
                        url: fetchUrl.default(
                            `/global-config/services/${serviceType}/${subSchemaType}/${subSchemaInstance}`,
                            { realm: false }),
                        headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                        type: "DELETE"
                    });
                },

                update (serviceType, subSchemaType, subSchemaInstance, data) {
                    return obj.serviceCall({
                        url: fetchUrl.default(
                            `/global-config/services/${serviceType}/${subSchemaType}/${subSchemaInstance}`,
                            { realm: false }),
                        headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                        type: "PUT",
                        data: JSON.stringify(data)
                    });
                },

                create (serviceType, subSchemaType, data) {
                    return obj.serviceCall({
                        url: fetchUrl.default(
                            `/global-config/services/${serviceType}/${subSchemaType}?_action=create`, { realm: false }),
                        headers: { "Accept-API-Version": "protocol=1.0,resource=1.0" },
                        type: "POST",
                        data: JSON.stringify(data)
                    });
                }
            }
        }
    };

    return obj;
});