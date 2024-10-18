import { CountryModel } from "../../models/country.model";
import { getResponseMessage, setErrorResponse, setSuccessResponse } from "../../services/responseServices"; // Adjust path
import { sequelize } from "@loaders/database";
import { ICountryCreation } from "@dtos/country.dto";
import { ResponseDto } from "@dtos/reusableDtos";
import { IStateCreation } from "@dtos/state.dtos";
import { StateModel } from "../../models/state.model";
import { CityModel } from "../../models/city.model";
import { Op } from "sequelize";
import { v2 as cloudinary } from "cloudinary";
import { CategoryModel } from "../../models/category.model";
import slugify from "slugify";
import { ISubcategoryCreation } from "@dtos/subcategory.dto";
import { SubcategoryModel } from "../../models/subcategory.model";

export const addCountry = async (countryDetails: ICountryCreation, file: Express.Multer.File): Promise<ResponseDto> => {
    const transaction = await sequelize.transaction();
    let response: ResponseDto;
    try {

        const { name } = countryDetails;


        const formattedName = name.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());


        const existingCountry = await CountryModel.findOne({
            where: { name: formattedName },
            transaction,
        });

        if (existingCountry) {

            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("COUNTRY_ALREADY_EXISTS"),
            });
        }

        const uploadResponse = await cloudinary.uploader.upload(file.path, {
            folder: "uploads",
            allowed_formats: ["jpg", "jpeg", "png"]
        });


        const newCountry = await CountryModel.create(
            {
                name: formattedName,
                flag: uploadResponse.secure_url,
            },
            { transaction }
        );

        if (!newCountry) {

            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("FAILED_TO_CREATE_COUNTRY"),
            });
        }


        await transaction.commit();


        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("COUNTRY_CREATED_SUCCESSFULLY"),
            data: newCountry,
        });
    } catch (error) {

        await transaction.rollback();
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};


export const addState = async (stateDetails: IStateCreation): Promise<ResponseDto> => {
    const transaction = await sequelize.transaction();
    let response: ResponseDto;
    try {

        const { country_id, state_name, short_name, gst } = stateDetails;
        const existingCountry = await CountryModel.findOne({
            where: { country_id: country_id },
            transaction,
        });

        if (!existingCountry) {

            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("COUNTRY_NOT_PRESENT"),
            });
        }


        const stateCreation = await StateModel.create(
            {
                country_id,
                short_name,
                state_name,
                gst
            },
            { transaction }
        );

        if (!stateCreation) {

            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("STATE_CREATION_FAILED"),
            });
        }


        await transaction.commit();


        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("STATE_CREATED_SUCCESSFULLY"),
            data: stateCreation,
        });
    } catch (error) {

        await transaction.rollback();
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};


export const getAllStates = async (data: any): Promise<ResponseDto> => {

    const { country_id } = data;
    let response: ResponseDto;
    try {


        const FindAllStates = await StateModel.findAll({
            where: { country_id },
            include: [
                {
                    model: CountryModel,
                    as: "country",
                    attributes: ["name"],
                },
            ],
        });

        console.log(FindAllStates, "FindAllStates");

        if (FindAllStates.length === 0) {


            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("NO_STATE_PRESENT"),
            });
        }


        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("STATES_ARE_PRESENT"),
            data: FindAllStates,
        });
    } catch (error) {


        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};


export const addCity = async (data: any): Promise<ResponseDto> => {
    const { country_id, state_id, city_name } = data;
    let response: ResponseDto;
    try {

        const countryExists = await CountryModel.findOne({
            where: { country_id: country_id },
        });

        if (!countryExists) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("COUNTRY_NOT_PRESENT"),
            });
        }


        const stateExists = await StateModel.findOne({
            where: { state_id, country_id },
        });

        if (!stateExists) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("STATE_NOT_FOUND_OR_NOT_IN_COUNTRY"),
            });
        }


        const createCity = await CityModel.create({
            country_id,
            state_id,
            city_name,
        });

        if (!createCity) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("UNABLE_TO_ADD_CITY"),
            });
        }

        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("CITY_CREATED_SUCCESSFULLY"),
            data: createCity,
        });

    } catch (error) {
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};


export const getAllCities = async (data: any): Promise<ResponseDto> => {
    const { country_id, state_id } = data;
    let response: ResponseDto;

    try {

        const countryExists = await CountryModel.findOne({
            where: { country_id },
        });

        if (!countryExists) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("COUNTRY_NOT_PRESENT"),
            });
        }


        const stateExists = await StateModel.findOne({
            where: { state_id, country_id },
        });

        if (!stateExists) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("STATE_NOT_FOUND_OR_INVALID_FOR_COUNTRY"),
            });
        }


        const allCities = await CityModel.findAll({
            where: {
                [Op.and]: [{ country_id: country_id }, { state_id: state_id }],
            },
            include: [
                {
                    model: CountryModel,
                    as: "country",
                    attributes: ["name"],
                },
                {
                    model: StateModel,
                    as: "state",
                    attributes: ["state_name"],
                },
            ],
        });

        // Check if cities are present
        if (!allCities || allCities.length === 0) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("NO_CITIES_PRESENT"),
            });
        }

        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("CITIES_FOUND"),
            data: allCities,
        });

    } catch (error) {
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};

export const getAllCountries = async (): Promise<ResponseDto> => {

    let response: ResponseDto;
    try {
        const getAllCountires = await CountryModel.findAll({

        });

        if (getAllCountires.length === 0) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("NO_COUNTRY_FOUND"),
            });
        }
        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("COUNTRY_FOUND"),
            data: getAllCountires,
        });
    } catch (error) {


        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};




export const addCategory = async (categoryDetails: ICountryCreation, file: Express.Multer.File): Promise<ResponseDto> => {
    const transaction = await sequelize.transaction();
    let response: ResponseDto;
    try {

        const { name } = categoryDetails;
        console.log(name, "names");


        const formattedName = name.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());


        const slug = slugify(name, {
            lower: true,
            strict: true
        });

        const existingCategory = await CategoryModel.findOne({
            where: { name: formattedName },
            transaction,
        });

        console.log(existingCategory, "existingCategory");

        if (existingCategory) {
            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("CATEGORY_ALREADY_EXISTS"),
            });
        }

        console.log("before_upload");
        const uploadResponse = await cloudinary.uploader.upload(file.path, {
            folder: "upload",
            allowed_formats: ["jpg", "jpeg", "png"]
        });
        console.log("another");
        console.log(uploadResponse, "uploadResponse");

        const newCategory = await CategoryModel.create(
            {
                name: formattedName,
                slug: slug,
                icon: uploadResponse.secure_url,
            },
            { transaction }
        );

        console.log(newCategory, "newCategory");
        if (!newCategory) {
            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("FAILED_TO_CREATE_CATEGORY"),
            });
        }

        await transaction.commit();

        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("CATEGORY_CREATED_SUCCESSFULLY"),
            data: newCategory,
        });

    } catch (error) {
        await transaction.rollback();
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};


export const getAllCategory = async (): Promise<ResponseDto> => {

    let response: ResponseDto;
    try {
        const getAllCategory = await CategoryModel.findAll({

        });

        if (getAllCategory.length === 0) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("CATEGORY_NOT_FOUND"),
            });
        }
        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("CATEGORY_FOUND"),
            data: getAllCategory,
        });
    } catch (error) {


        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};

export const addSubCategory = async (subCategoryDetails: ISubcategoryCreation, file: Express.Multer.File): Promise<ResponseDto> => {
    const transaction = await sequelize.transaction();
    let response: ResponseDto;
    try {

        const { category_id, sub_category_name } = subCategoryDetails;
        const existingCategory = await CategoryModel.findOne({
            where: { category_id },
            transaction,
        });

        if (!existingCategory) {

            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("CATEGORY_NOT_FOUND"),
            });
        }
        const uploadResponse = await cloudinary.uploader.upload(file.path, {
            folder: "upload",
            allowed_formats: ["jpg", "jpeg", "png"]
        });

        const subcategoriesCreation = await SubcategoryModel.create(
            {
                category_id, sub_category_name, icon: uploadResponse.secure_url,
            },
            { transaction }
        );

        if (!subcategoriesCreation) {

            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("STATE_CREATION_FAILED"),
            });
        }


        await transaction.commit();


        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("SUBCATEGORY_CREATED_SUCCESSFULLY"),
            data: subcategoriesCreation,
        });
    } catch (error) {

        await transaction.rollback();
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};


export const deleteSubCategory = async (categoryId: number, subCategoryId: number): Promise<ResponseDto> => {
    const transaction = await sequelize.transaction();
    let response: ResponseDto;

    try {

        const existingSubCategory = await SubcategoryModel.findOne({
            where: {
                [Op.and]: [
                    { subcategory_id: subCategoryId },
                    { category_id: categoryId }
                ]
            },
            transaction,
        });

        if (!existingSubCategory) {
            await transaction.rollback();
            return setErrorResponse({
                statusCode: 404,
                message: getResponseMessage("SUBCATEGORY_NOT_FOUND"),
            });
        }


        const deleteResult = await SubcategoryModel.destroy({
            where: {
                [Op.and]: [
                    { subcategory_id: subCategoryId },
                    { category_id: categoryId }
                ]
            },
            transaction,
        });

        if (!deleteResult) {
            await transaction.rollback();
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("SUBCATEGORY_DELETION_FAILED"),
            });
        }

        await transaction.commit();
        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("SUBCATEGORY_DELETED_SUCCESSFULLY"),
        });
    } catch (error) {
        await transaction.rollback();
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};


export const getStates = async (): Promise<ResponseDto> => {
    let response: ResponseDto;
    try {
        // Fetch all states along with the associated country
        const FindAllStates = await StateModel.findAll({
            include: [
                {
                    model: CountryModel,
                    as: "country",
                    attributes: ["name"],
                },
            ],
            attributes: ["state_name", "short_name", "country_id"], // Use the correct column names here
        });

        // Check if no states are found
        if (FindAllStates.length === 0) {
            return setErrorResponse({
                statusCode: 400,
                message: getResponseMessage("NO_STATE_PRESENT"),
            });
        }

        // Transform the data to the desired format
        const countryMap: { [key: string]: any } = {};

        // Group states by country and ensure uniqueness
        FindAllStates.forEach((state: any) => {
            const countryName = state.country.name;
            const stateName = state.state_name; // Corrected from state.name to state.state_name
            const shortName = state.short_name; // Corrected from state.shortname to state.short_name

            // If the country is not already in the map, add it with empty sets for states and shortnames
            if (!countryMap[countryName]) {
                countryMap[countryName] = {
                    country: countryName,
                    states: new Set(),
                    shortnames: new Set(),
                };
            }

            // Add state name and shortname to the respective sets to ensure uniqueness
            if (stateName) {
                countryMap[countryName].states.add(stateName);
            }
            if (shortName) {
                countryMap[countryName].shortnames.add(shortName);
            }
        });

        // Convert sets to arrays and the map to an array of objects
        const formattedResult = Object.values(countryMap).map((entry: any) => ({
            country: entry.country,
            states: Array.from(entry.states),       // Convert the set to an array
            shortnames: Array.from(entry.shortnames), // Convert the set to an array
        }));

        // Return the success response with the formatted data
        return setSuccessResponse({
            statusCode: 200,
            message: getResponseMessage("STATES_ARE_PRESENT"),
            data: formattedResult,
        });
    } catch (error) {
        // Return the error response in case of an exception
        const result: ResponseDto = setErrorResponse({
            statusCode: 500,
            message: getResponseMessage("SOMETHING_WRONG"),
            error,
            details: error,
        });
        return result;
    }
};

