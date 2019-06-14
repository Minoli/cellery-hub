/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint prefer-promise-reject-errors: ["off"] */
/* eslint camelcase: ["off"] */

import AuthUtils from "./authUtils";
import {StateHolder} from "../../components/common/state";
import axios from "axios";
import HttpUtils, {HubApiError} from "./httpUtils";

jest.mock("axios");

describe("HttpUtils", () => {
    describe("parseQueryParams()", () => {
        it("should parse and return the query parameters as an object", () => {
            const query = HttpUtils.parseQueryParams("?key1=value1&key2=value2&key3=value3");

            expect(Object.keys(query)).toHaveLength(3);
            expect(query.key1).toBe("value1");
            expect(query.key2).toBe("value2");
            expect(query.key3).toBe("value3");
        });

        it("should parse and return the query if the query string doesn't have the '?' prefix", () => {
            const query = HttpUtils.parseQueryParams("key1=value1&key2=value2&key3=value3");

            expect(Object.keys(query)).toHaveLength(3);
            expect(query.key1).toBe("value1");
            expect(query.key2).toBe("value2");
            expect(query.key3).toBe("value3");
        });

        it("should parse and return the decoded query parameters if the query parameters had been URL encoded", () => {
            const query = HttpUtils.parseQueryParams("?key1=value%201&key2=value%2D2&key%213=value3");

            expect(Object.keys(query)).toHaveLength(3);
            expect(query.key1).toBe("value 1");
            expect(query.key2).toBe("value-2");
            expect(query["key!3"]).toBe("value3");
        });

        it("should true for the parameters which has a key but doesn't have a value", () => {
            const query = HttpUtils.parseQueryParams("?key1=&key2");

            expect(Object.keys(query)).toHaveLength(2);
            expect(query.key1).toBe(true);
            expect(query.key2).toBe(true);
        });

        it("should return object with no keys without failing if empty query is provided", () => {
            expect(Object.keys(HttpUtils.parseQueryParams("?"))).toHaveLength(0);
            expect(Object.keys(HttpUtils.parseQueryParams(""))).toHaveLength(0);
            expect(Object.keys(HttpUtils.parseQueryParams("?="))).toHaveLength(0);
            expect(Object.keys(HttpUtils.parseQueryParams("?&&=&&"))).toHaveLength(0);
            expect(Object.keys(HttpUtils.parseQueryParams(undefined))).toHaveLength(0);
            expect(Object.keys(HttpUtils.parseQueryParams(null))).toHaveLength(0);
        });
    });

    describe("generateQueryParamString()", () => {
        it("should generate the query param string from the provided object", () => {
            const queryParams = HttpUtils.generateQueryParamString({
                key1: "value1",
                key2: "value2",
                key3: "value3",
                key4: true,
                key5: 134
            });

            expect(queryParams).toBe("?key1=value1&key2=value2&key3=value3&key4=true&key5=134");
        });

        it("should generate the URL encoded query param string from the provided object", () => {
            const queryParams = HttpUtils.generateQueryParamString({
                key1: "value 1",
                key2: "value-2",
                "key:3": "value3"
            });

            expect(queryParams).toBe("?key1=value%201&key2=value-2&key%3A3=value3");
        });

        it("should generate the query param string from the provided object without undefined and null values", () => {
            const queryParams = HttpUtils.generateQueryParamString({
                key1: "value1",
                key2: "value2",
                key3: undefined,
                key4: null
            });

            expect(queryParams).toBe("?key1=value1&key2=value2");
        });

        it("should return empty string without failing when a proper object is not provided", () => {
            expect(HttpUtils.generateQueryParamString(undefined)).toBe("");
            expect(HttpUtils.generateQueryParamString(null)).toBe("");
            expect(HttpUtils.generateQueryParamString({})).toBe("");
        });

        {
            const faultyQueries = [
                {
                    type: "Array",
                    data: {
                        key1: "value1",
                        key2: ["value2a", "value2b", "value2c"]
                    }
                },
                {
                    type: "Object",
                    data: {
                        key3: "value4`",
                        key4: {
                            value2a: "value2a",
                            value2b: "value2b",
                            value2c: "value2c"
                        }
                    }
                }
            ];

            for (const query of faultyQueries) {
                it(`should throw an error if a key with value of type ${query.type} is provided`, () => {
                    expect(() => HttpUtils.generateQueryParamString(query.data)).toThrow();
                });
            }
        }
    });

    describe("callHubAPI()", () => {
        const endpoint = "/test";
        let stateHolder;
        const loggedInUser = {
            username: "test-user",
            tokens: {
                accessToken: "12345",
                idToken: "54321"
            }
        };
        const globalConfig = {
            hubApiUrl: "http://api.hub.cellery.io",
            idp: {
                url: "https://idp.hub.cellery.io",
                hubClientId: "testhubclientid",
                sdkClientId: "testsdkclientid"
            }
        };

        beforeEach(() => {
            stateHolder = new StateHolder();
            stateHolder.set(StateHolder.USER, loggedInUser);
            stateHolder.set(StateHolder.CONFIG, globalConfig);
        });

        it("should add application/json header", async () => {
            axios.mockImplementation((config) => {
                expect(Object.keys(config)).toHaveLength(4);
                expect(config.withCredentials).toBe(true);
                expect(config.method).toBe("GET");
                expect(config.url).toBe(globalConfig.hubApiUrl + endpoint);
                expect(Object.keys(config.headers)).toHaveLength(4);
                expect(config.headers["X-Key"]).toBe("value");
                expect(config.headers.Accept).toBe("application/json");
                expect(config.headers.Authorization).toBe(`Bearer ${loggedInUser.tokens.accessToken}`);
                expect(config.headers["Content-Type"]).toBe("application/json");

                return new Promise((resolve) => {
                    resolve({
                        status: 200,
                        data: [
                            {
                                value: "testData"
                            }
                        ]
                    });
                });
            });

            await HttpUtils.callHubAPI({
                method: "GET",
                url: endpoint,
                headers: {
                    "X-Key": "value"
                }
            }, stateHolder);
        });

        it("should add application/json Accept and Content-Type headers if no headers are provided", async () => {
            axios.mockImplementation((config) => {
                expect(Object.keys(config)).toHaveLength(4);
                expect(config.withCredentials).toBe(true);
                expect(config.method).toBe("GET");
                expect(config.url).toBe(globalConfig.hubApiUrl + endpoint);
                expect(Object.keys(config.headers)).toHaveLength(3);
                expect(config.headers.Accept).toBe("application/json");
                expect(config.headers.Authorization).toBe(`Bearer ${loggedInUser.tokens.accessToken}`);
                expect(config.headers["Content-Type"]).toBe("application/json");

                return new Promise((resolve) => {
                    resolve({
                        status: 200,
                        data: [
                            {
                                value: "testData"
                            }
                        ]
                    });
                });
            });

            await HttpUtils.callHubAPI({
                method: "GET",
                url: endpoint
            }, stateHolder);
        });

        it("should not change headers if Accept header is already provided", async () => {
            axios.mockImplementation((config) => {
                expect(Object.keys(config)).toHaveLength(4);
                expect(config.withCredentials).toBe(true);
                expect(config.method).toBe("GET");
                expect(config.url).toBe(globalConfig.hubApiUrl + endpoint);
                expect(Object.keys(config.headers)).toHaveLength(3);
                expect(config.headers.Accept).toBe("application/xml");
                expect(config.headers.Authorization).toBe(`Bearer ${loggedInUser.tokens.accessToken}`);
                expect(config.headers["Content-Type"]).toBe("application/json");

                return new Promise((resolve) => {
                    resolve({
                        status: 200,
                        data: [
                            {
                                value: "testData"
                            }
                        ]
                    });
                });
            });

            await HttpUtils.callHubAPI({
                method: "GET",
                url: endpoint,
                headers: {
                    Accept: "application/xml"
                }
            }, stateHolder);
        });

        it("should add application/json header if Content-Type header is provided", async () => {
            axios.mockImplementation((config) => {
                expect(Object.keys(config)).toHaveLength(4);
                expect(config.withCredentials).toBe(true);
                expect(config.method).toBe("GET");
                expect(config.url).toBe(globalConfig.hubApiUrl + endpoint);
                expect(Object.keys(config.headers)).toHaveLength(3);
                expect(config.headers.Accept).toBe("application/json");
                expect(config.headers.Authorization).toBe(`Bearer ${loggedInUser.tokens.accessToken}`);
                expect(config.headers["Content-Type"]).toBe("application/json");

                return new Promise((resolve) => {
                    resolve({
                        status: 200,
                        data: [
                            {
                                value: "testData"
                            }
                        ]
                    });
                });
            });

            await HttpUtils.callHubAPI({
                method: "GET",
                url: endpoint
            }, stateHolder);
        });

        it("should not change headers if Content-Type header is already provided", async () => {
            axios.mockImplementation((config) => {
                expect(Object.keys(config)).toHaveLength(4);
                expect(config.withCredentials).toBe(true);
                expect(config.method).toBe("GET");
                expect(config.url).toBe(globalConfig.hubApiUrl + endpoint);
                expect(Object.keys(config.headers)).toHaveLength(3);
                expect(config.headers.Accept).toBe("application/json");
                expect(config.headers.Authorization).toBe(`Bearer ${loggedInUser.tokens.accessToken}`);
                expect(config.headers["Content-Type"]).toBe("application/xml");

                return new Promise((resolve) => {
                    resolve({
                        status: 200,
                        data: [
                            {
                                value: "testData"
                            }
                        ]
                    });
                });
            });

            await HttpUtils.callHubAPI({
                method: "GET",
                url: endpoint,
                headers: {
                    "Content-Type": "application/xml"
                }
            }, stateHolder);
        });

        it("should reject with the error if an error without response is provided", async () => {
            axios.mockImplementation(
                () => new Promise((resolve, reject) => reject(new Error("Test Error"))));

            const callHubAPIPromise = HttpUtils.callHubAPI({
                url: endpoint,
                methods: "POST"
            }, stateHolder);

            await expect(callHubAPIPromise).rejects.toEqual(new Error("Test Error"));
        });

        const ERROR_DATA = "testError";
        const SUCCESS_OUTPUT_DATA = ["testEvent"];
        const unauthorizedStatusCode = 401;
        const resolveStatusCodes = [
            200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
            300, 301, 302, 303, 304, 305, 306, 307, 308
        ];
        const rejectStatusCodes = [
            400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418,
            421, 422, 423, 424, 426, 428, 429, 431, 451,
            500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511
        ];

        const mockResolve = (statusCode) => {
            axios.mockResolvedValue(new Promise((resolve) => {
                resolve({
                    status: statusCode,
                    data: SUCCESS_OUTPUT_DATA
                });
            }));

            return HttpUtils.callHubAPI({
                method: "GET",
                url: endpoint,
                headers: {
                    Accept: "application/xml"
                }
            }, stateHolder);
        };
        const mockReject = (statusCode, noStateHolder = false) => {
            axios.mockResolvedValue(new Promise((resolve, reject) => {
                reject({
                    response: {
                        status: statusCode,
                        data: ERROR_DATA
                    }
                });
            }));

            return HttpUtils.callHubAPI({
                method: "GET",
                url: endpoint,
                headers: {
                    Accept: "application/xml",
                    Authorization: "12345"
                }
            }, (noStateHolder ? undefined : stateHolder));
        };

        resolveStatusCodes.forEach((statusCode) => {
            it(`should resolve with response data when axios resolves with a ${statusCode} status code`, () => {
                expect.assertions(1);
                return expect(mockResolve(statusCode)).resolves.toEqual(SUCCESS_OUTPUT_DATA);
            });
        });

        rejectStatusCodes.forEach((statusCode) => {
            it(`should reject with response data when axios resolves with a ${statusCode} status code`, () => {
                expect.assertions(1);
                return expect(mockResolve(statusCode)).rejects.toEqual(SUCCESS_OUTPUT_DATA);
            });
        });

        rejectStatusCodes.filter((statusCode) => statusCode !== unauthorizedStatusCode).forEach((statusCode) => {
            it(`should reject with response data when axios rejects with a ${statusCode} status code`, () => {
                expect.assertions(1);
                return expect(mockReject(statusCode)).rejects.toEqual(new HubApiError(ERROR_DATA, statusCode));
            });
        });

        it("should reject with response and initiate login flow when axios rejects with a "
            + `${unauthorizedStatusCode} status code`, async () => {
            const spy = jest.spyOn(AuthUtils, "initiateHubLoginFlow");
            AuthUtils.setDefaultFIdP("github");
            jest.spyOn(window.location, "assign").mockImplementation((location) => {
                const params = {
                    response_type: "code",
                    nonce: "auth",
                    scope: "openid",
                    client_id: globalConfig.idp.hubClientId,
                    redirect_uri: window.location.href,
                    fidp: "github"
                };
                const endpoint = `${globalConfig.idp.url}${AuthUtils.AUTHORIZATION_ENDPOINT}`;
                expect(location).toEqual(`${endpoint}${HttpUtils.generateQueryParamString(params)}`);
            });
            await expect(mockReject(unauthorizedStatusCode)).rejects.toEqual(
                new HubApiError(ERROR_DATA, unauthorizedStatusCode));
            expect(spy).toHaveBeenCalledTimes(1);
            window.location.assign.mockClear();
        });
    });
});
