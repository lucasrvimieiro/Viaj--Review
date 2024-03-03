import { IoMdCloseCircle } from "react-icons/io";
import React, { useState, useEffect } from "react";
import AddButton from "src/core/components/buttons/AddButton";
import CancelButton from "src/core/components/buttons/CancelButton";
import ConfirmButton from "src/core/components/buttons/ConfirmButton";
import { supabase } from "src/lib/supabase/supabase";
import ImageExpander from "src/core/components/interface/ImageExpander";
import ConfirmAction from "src/core/components/interface/ConfirmAction";
import { timeNow } from "src/lib/functions/timeFunctions";
import { displayToast } from "src/lib/functions/displayToast";
import { v4 as uuidv4 } from "uuid";
import RemoveIconButton from "src/core/components/buttons/RemoveIconButton";
import EditIconButton from "src/core/components/buttons/EditIconButton";

export default function ModalEditarPromocao({
	closeModal,
	getRowData,
	updateTable,
}) {
	/* ============ STATES E VARIÁVEIS ============ */
	let getImgURL = "";
	const [loadingEdit, setLoadingEdit] = useState(false);
	const [imageExpander, setImageExpander] = useState(false);
	const [expandedImage, setExpandedImage] = useState(null);
	const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
	const [varProfileName, setVarProfileName] = useState(getRowData.profileName);
	const [varImageHolder, setVarImageHolder] = useState(null);
	const [varImageHolderSrc, setVarImageHolderSrc] = useState(
		getRowData.imageUrl
	);
	const [varTitle, setVarTitle] = useState(getRowData.title);
	const [varProducts, setVarProducts] = useState(getRowData.productList);
	const [varOriginalProducts, setVarOriginalProducts] = useState(
		getRowData.productList
	);
	const [productFileRefs, setProductFileRefs] = useState([]);
	const [productImagePreviews, setProductImagePreviews] = useState({});
	useEffect(() => {
		setProductFileRefs(
			Array(varProducts.length)
				.fill(null)
				.map(() => React.createRef())
		);
	}, [varProducts]);

	/* ============ SALVAR INFORMAÇÕES ============ */
	const saveModal = async () => {
		/* ============ ATIVAR ESTADO DE CARREGAMENTO ============ */
		setLoadingEdit(true);
		/* ============ ENVIAR IMAGEM PARA DATABASE SE TIVER SIDO ALTERADA ============ */
		if (varImageHolder != null) {
			const uniqueUUID = uuidv4();
			/* ============ APAGAR IMAGEM ANTERIOR ============ */
			const { data: imageDelete, error: imageDeleteError } =
				await supabase.storage
					.from("promocoes")
					.remove([`promocoes_images/${getRowData.imageUrl.split("/").pop()}`]);
			if (imageDeleteError) {
				return displayToast({
					toastType: 0,
					message: `Ocorreu um erro: ${imageDeleteError.message}`,
					duration: 4000,
				});
			}
			/* ============ ENVIAR NOVA IMAGEM ============ */
			const { data: imageUpload, error: imageUploadError } =
				await supabase.storage
					.from("promocoes")
					.upload(`promocoes_images/${uniqueUUID}`, varImageHolder);
			if (imageUploadError) {
				return displayToast({
					toastType: 0,
					message: `Ocorreu um erro: ${imageUploadError.message}`,
					duration: 4000,
				});
			} else {
				getImgURL = supabase.storage
					.from("promocoes")
					.getPublicUrl(`promocoes_images/${uniqueUUID}`);
			}
		}

		const newestProducts = await Promise.all(
			varProducts.map(async (product, index) => {
				if (product.image instanceof File) {
					let getProductUrl = "";
					const uniqueUUID = uuidv4();
					try {
						const { data: imageProductDelete, error: imageProductDeleteError } =
							await supabase.storage
								.from("promocoes")
								.remove([
									`promocoes_products/${varOriginalProducts[index].image
										.split("/")
										.pop()}`,
								]);
						if (imageProductDeleteError) {
							return displayToast({
								toastType: 0,
								message: `Ocorreu um erro: ${imageProductDeleteError.message}`,
								duration: 4000,
							});
						}
					} catch (err) {
						() => {};
					}
					const { data: imageProductUpload, error: imageProductUploadError } =
						await supabase.storage
							.from("promocoes")
							.upload(`promocoes_products/${uniqueUUID}`, product.image);
					if (imageProductUploadError) {
						return displayToast({
							toastType: 0,
							message: `Ocorreu um erro: ${imageProductUploadError.message}`,
							duration: 4000,
						});
					} else {
						getProductUrl = supabase.storage
							.from("promocoes")
							.getPublicUrl(`promocoes_products/${uniqueUUID}`);
						product.image = getProductUrl.data.publicUrl;
					}
				}
				return product;
			})
		);
		setVarProducts(newestProducts);

		/* ============ SALVAR INFORMAÇÕES ============ */
		const { data: info, error: infoError } = await supabase
			.from("promocoes")
			.upsert(
				[
					{
						id: getRowData.id,
						profileName: varProfileName,
						imageUrl: getImgURL ? getImgURL.data.publicUrl : varImageHolderSrc,
						title: varTitle,
						productList: varProducts,
						latestModified: timeNow().iso,
					},
				],
				{ onConflict: ["id"] }
			);
		if (infoError) {
			return displayToast({
				toastType: 0,
				message: `Ocorreu um erro: ${infoError.message}`,
				duration: 4000,
			});
		}
		/* ============ DESATIVAR ESTADO DE CARREGAMENTO ============ */
		setAwaitingConfirmation(false);
		setLoadingEdit(false);
		closeModal();
		updateTable();
		return displayToast({
			toastType: 1,
			message: `As modificações foram salvas com sucesso!`,
			duration: 4000,
		});
	};

	/* ============ SELEÇÃO DE ENVIO DE IMAGEM ============ */
	const handleImageUpload = async (e) => {
		const fileInput = e.target;
		const fileSize = fileInput.files[0]?.size || 0;
		const maxSize = 3 * 1024 * 1024;
		if (fileSize > maxSize) {
			displayToast({
				toastType: 0,
				message: `O tamanho da imagem excede o limite de 3MB.`,
				duration: 4000,
			});
			fileInput.value = "";
		} else {
			setVarImageHolder(fileInput.files[0]);
			setVarImageHolderSrc(URL.createObjectURL(fileInput.files[0]));
			return displayToast({
				toastType: 1,
				message: `Imagem selecionada com sucesso!`,
				duration: 4000,
			});
		}
	};

	/* ============ SELEÇÃO DE ENVIO DE IMAGEM DE PRODUTOS ============ */
	const handleProductImageUpload = async (e, productId) => {
		const fileInput = e.target;
		const fileSize = fileInput.files[0]?.size || 0;
		const maxSize = 3 * 1024 * 1024;
		if (fileSize > maxSize) {
			displayToast({
				toastType: 0,
				message: `O tamanho da imagem excede o limite de 3MB.`,
				duration: 4000,
			});
			fileInput.value = "";
		} else {
			const updatedProducts = varProducts.map((product) => {
				return product.id === productId
					? {
							...product,
							image: fileInput.files[0],
					  }
					: product;
			});
			setVarProducts(updatedProducts);
			const originalProduct = varOriginalProducts.find(
				(product) => product.id === productId
			);
			const reader = new FileReader();
			reader.onload = (event) => {
				// Save the local image preview URL in state.
				setProductImagePreviews((prevPreviews) => ({
					...prevPreviews,
					[productId]: event.target.result,
				}));
			};
			reader.readAsDataURL(fileInput.files[0]);
			/* if (originalProduct && originalProduct.image) {
				try {
					const { data: imageProductDelete, error: imageProductDeleteError } =
						await supabase.storage
							.from("promocoes")
							.remove([
								`promocoes_products/${originalProduct.image.split("/").pop()}`,
							]);
					if (imageProductDeleteError) {
						displayToast({
							toastType: 0,
							message: `Ocorreu um erro: ${imageProductDeleteError.message}`,
							duration: 4000,
						});
					}
				} catch (err) {
					console.error(err);
				}
			} */
			displayToast({
				toastType: 1,
				message: `Imagem selecionada com sucesso!`,
				duration: 4000,
			});
		}
	};

	/**
	 * Os states abaixo garantem que seja gerado um ID único
	 * para cada item adicionado ou removido das listas. Caso
	 * o requerimento não seja cumprido, a função apagará o item
	 * incorreto da lista
	 */
	const [uniqueProductId, setUniqueProductId] = useState(
		getRowData.productList.length
	);

	const handleProductChange = (id, key, value) => {
		setVarProducts((prevProducts) =>
			prevProducts.map((s) => (s.id === id ? { ...s, [key]: value } : s))
		);
	};
	const deleteProduct = (id) => {
		setVarProducts((varProducts) => varProducts.filter((s) => s.id !== id));
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-25 flex justify-center items-center z-[990]">
			<div className="w-full lg:min-w-[800px] lg:max-w-[1200px] max-w-[95vw] flex flex-col lg:m-0 overflow-hidden rounded-xl">
				<div className="bg-white rounded-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
					{/* ============ TÍTULO DO QUADRO ============ */}
					<div className="absolute bg-[--color-persian-blue] p-4 text-white rounded-t-xl font-rubik-bd text-lg flex justify-between lg:min-w-[800px] lg:max-w-[1200px] w-[95vw]">
						<span>Editar promoção {`#${getRowData.id}`}</span>
						<IoMdCloseCircle
							className="cursor-pointer"
							size={30}
							onClick={closeModal}
							title="Fechar sem salvar"
						/>
					</div>
					{/* ============ FORMULÁRIO ============ */}
					<div className="p-4 flex flex-col lg:mt-16 mt-12 lg:mb-2 mb-16">
						<div className="flex flex-col">
							{/* ============ EMPRESA ============ */}
							<div className="flex lg:items-center my-2 lg:flex-row flex-col">
								<span className="font-rubik-bd whitespace-nowrap mr-2">
									Empresa:{" "}
								</span>
								<input
									type="text"
									defaultValue={getRowData.profileName}
									className="line-input"
									onChange={(e) => setVarProfileName(e.target.value)}
								/>
							</div>
							{/* ============ FOTO DA CAPA ============ */}
							<div className="flex lg:items-center lg:justify-start justify-center my-2 lg:flex-row flex-col">
								<span className="font-rubik-bd whitespace-nowrap mr-2">
									Foto da capa:{" "}
								</span>
								{varImageHolderSrc != null && (
									<img
										src={varImageHolderSrc}
										alt=""
										title="Ampliar imagem"
										className="w-16 cursor-zoom-in ml-2"
										onClick={(e) => {
											setImageExpander(!imageExpander);
											setExpandedImage(e.target.getAttribute("src"));
										}}
									/>
								)}
								{imageExpander && (
									<ImageExpander
										closeExpander={() => {
											setImageExpander(false);
											setExpandedImage(null);
										}}
										imageUrl={expandedImage}
									/>
								)}
								<input
									type="file"
									id="uploadImage"
									name="uploadImage"
									accept="image/*"
									className="ml-4 cursor-pointer mt-2 lg:mt-0"
									onChange={handleImageUpload}
								/>
							</div>
							{/* ============ TÍTULO DA PROMOÇÃO ============ */}
							<div className="flex lg:items-center my-2 lg:flex-row flex-col">
								<span className="font-rubik-bd whitespace-nowrap mr-2">
									Título da Promoção:{" "}
								</span>
								<input
									type="text"
									defaultValue={getRowData.title}
									className="line-input"
									onChange={(e) => setVarTitle(e.target.value)}
								/>
							</div>
							{/* ============ PRODUTOS ============ */}
							<div className="flex my-2 lg:flex-row flex-col">
								<span className="font-rubik-bd whitespace-nowrap">
									Produtos:{` (${varProducts.length})`}
								</span>
								<div className="flex flex-col">
									<div className="flex flex-wrap">
										{varProducts.map((s, index) => (
											<div
												key={`${s.id}`}
												className="bg-[--color-night] rounded-lg text-white flex p-2 m-2 items-start"
											>
												<div className="flex flex-col">
													<div className="flex flex-row">
														<span className="relative">
															<img
																src={
																	s.image == ""
																		? "../assets/images/default_no_image.jpg"
																		: productImagePreviews[s.id] || s.image
																}
																alt=""
																className="w-16 h-16 object-cover cursor-zoom-in rounded-lg"
																onClick={(e) => {
																	setImageExpander(!imageExpander);
																	setExpandedImage(
																		e.target.getAttribute("src")
																	);
																}}
															/>
															<span className="absolute bottom-[-15px] left-1/2 -translate-x-1/2">
																<label htmlFor={`productFile-${s.id}`}>
																	<EditIconButton
																		onClick={() => {
																			productFileRefs[index].current.click();
																		}}
																	/>
																</label>
																<input
																	type="file"
																	id={`productFile-${s.id}`}
																	ref={productFileRefs[index]}
																	accept="image/*"
																	className="w-0 h-0 opacity-0 overflow-hidden absolute z-[-1]"
																	onChange={(e) =>
																		handleProductImageUpload(e, s.id)
																	}
																/>
															</span>
														</span>
														<div className="flex flex-col text-sm ml-2">
															<input
																type="text"
																defaultValue={s.name}
																placeholder="(Nome...)"
																className="edit-text-input font-rubik-bd"
																onChange={(e) =>
																	handleProductChange(
																		s.id,
																		"name",
																		e.target.value
																	)
																}
															/>
															<input
																type="text"
																defaultValue={s.description}
																placeholder="(Descrição...)"
																className="edit-text-input"
																onChange={(e) =>
																	handleProductChange(
																		s.id,
																		"description",
																		e.target.value
																	)
																}
															/>
															<span className="mt-1">
																<span className="bg-[--color-night-light1] rounded-full py-[1.4px] px-2 text-sm">
																	R${" "}
																	<input
																		type="number"
																		step="0.10"
																		defaultValue={s.price.toFixed(2)}
																		className="edit-price-input"
																		onChange={(e) =>
																			handleProductChange(
																				s.id,
																				"price",
																				parseFloat(e.target.value)
																			)
																		}
																	/>
																</span>
															</span>
														</div>
														<span className="ml-2">
															<RemoveIconButton
																onClick={() => deleteProduct(s.id)}
															/>
														</span>
													</div>
													<span className="text-[--color-white-smoke-dark1] mt-6 text-sm">
														<textarea
															type="text"
															defaultValue={s.details}
															placeholder="(Observações...)"
															className="edit-text-input"
															onChange={(e) =>
																handleProductChange(
																	s.id,
																	"details",
																	e.target.value
																)
															}
														/>
													</span>
												</div>
											</div>
										))}
									</div>
									<div className="my-2 lg:mx-2 mx-0">
										<AddButton
											onClick={() => {
												setVarProducts([
													...varProducts,
													{
														id: uniqueProductId,
														name: "",
														image: "",
														price: 0,
														details: "",
														description: "",
													},
												]);
												setUniqueProductId(uniqueProductId + 1);
											}}
										/>
									</div>
								</div>
							</div>
							{/* ============ BOTÕES DE AÇÃO ============ */}
							<div className="mt-2 lg:justify-end justify-center flex w-full">
								<span className="px-2">
									<CancelButton onClick={closeModal} />
								</span>
								<ConfirmButton onClick={() => setAwaitingConfirmation(true)} />
								{awaitingConfirmation && (
									<ConfirmAction
										message={`Esta ação irá SALVAR E SOBREPOR os dados da promoção anterior. Não será possível reverter as alterações.`}
										handleCancel={() => setAwaitingConfirmation(false)}
										handleConfirm={() => saveModal()}
										loading={loadingEdit}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
